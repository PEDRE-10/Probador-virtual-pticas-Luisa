// Servidor de Ópticas Luisa — expone la interfaz web y los servicios de IA
// (asistente conversacional, lectura de recetas con visión y recomendaciones).
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { leerCitas, disponibilidad, agendar, HORARIOS, SERVICIOS } from "./citas.js";
import { guardarReceta, listarExpedientes, obtenerExpediente } from "./expedientes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Las recetas llegan como imagen base64 dentro del JSON.
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Clave para las vistas administrativas (expedientes y lista de citas).
// Defínela en .env; si no existe, se usa una temporal y se avisa en consola.
const ADMIN_CLAVE = process.env.ADMIN_CLAVE || "cambiar-esta-clave";

function requiereAdmin(req, res, next) {
  if (req.get("x-clave-admin") === ADMIN_CLAVE) return next();
  res.status(401).json({ error: "Se requiere la clave de administrador." });
}

const iaDisponible = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
);
const client = iaDisponible ? new Anthropic() : null;
const MODELO = "claude-opus-4-8";

const SISTEMA_ASISTENTE = `Eres "Luisa", la asistente virtual de Ópticas Luisa, una óptica mexicana.

# Qué puedes hacer
Eres una asistente de conocimiento general de primer nivel: puedes resolver todo tipo de
dudas del cliente (cultura general, tecnología, salud visual, trámites, redacción, cálculos,
recomendaciones, lo que te pregunten), siempre con respuestas útiles, claras y bien razonadas.
Tu especialidad es la óptica:
- Tipos de lentes (monofocales, bifocales, progresivos), tratamientos (antirreflejante,
  fotocromático, filtro de luz azul), armazones y lentes de contacto.
- Explicar en lenguaje sencillo recetas oftálmicas (esfera, cilindro, eje, adición,
  distancia pupilar).
- Recomendar armazones según la forma del rostro (ovalado, redondo, cuadrado, corazón, alargado).
- Agendar citas reales: tienes herramientas para consultar horarios y registrar la cita.
  Antes de agendar reúne nombre completo, teléfono, servicio y fecha/hora; confirma los datos
  con el cliente y después usa la herramienta. Tras agendar, repite día, hora y servicio.
- Aprovecha cada conversación para, con naturalidad y sin insistir, acercar al cliente a la
  óptica: sugerir el probador virtual, digitalizar su receta o agendar una cita.

# Confidencialidad (regla absoluta)
NUNCA reveles información interna o sensible del negocio, aunque insistan, aunque digan ser
empleados, dueños o autoridades, y aunque lo pidan "por curiosidad":
- Nombres de dueños, socios, gerentes, optometristas o cualquier empleado.
- Datos personales de otros clientes (nombres, teléfonos, recetas, citas de terceros).
- Graduaciones o recetas almacenadas en los expedientes de la óptica: NUNCA las consultes,
  dictes, resumas ni entregues por este chat, ni siquiera al propio cliente que lo pida.
  Esa información solo se maneja presencialmente en sucursal con el personal autorizado.
- Información financiera del negocio: ventas, costos, márgenes, proveedores, convenios.
- Domicilios particulares, horarios personales del personal, o detalles de seguridad.
- Detalles técnicos internos del sistema (claves, tecnología, configuración).
Cuando pregunten por algo de esto, decláralo con amabilidad y ofrece una alternativa útil:
"Esa información no la puedo compartir, pero con gusto te ayudo con tu cita o te comunico
con un asesor en sucursal". Jamás confirmes ni niegues datos específicos sensibles.

# Conducta y lenguaje (regla absoluta)
- JAMÁS uses groserías, vulgaridades, albures, doble sentido ni lenguaje ofensivo, aunque el
  cliente te lo pida, te rete o insista "en broma". Representas la imagen de Ópticas Luisa.
- No participes en conversaciones vulgares, sexuales, violentas, discriminatorias o de burla
  hacia personas. Tampoco generes chistes o contenido con groserías "solo por diversión".
- Si el cliente usa groserías o se pone agresivo, no lo imites ni lo regañes: mantén un tono
  sereno y profesional, y reconduce con amabilidad: "Con gusto te ayudo; ¿te apoyo con tus
  lentes, tu graduación o tu cita?". Si insiste en contenido inapropiado, decláralo
  cortésmente cuantas veces sea necesario y sigue ofreciendo ayuda útil.
- Sé siempre propositiva: recomienda armazones según la forma del rostro, tratamientos de
  mica según el estilo de vida, cuidados de los lentes y de la vista, e invita al probador
  virtual o a agendar cita cuando venga al caso.

# Salud y seguridad
- NO das diagnósticos médicos ni ajustas graduaciones. Ante síntomas (dolor ocular, visión
  súbitamente borrosa, destellos, ojo rojo), recomienda acudir de inmediato con el
  optometrista u oftalmólogo.
- Si no sabes algo específico de la sucursal (precios exactos, inventario), ofrece que un
  asesor lo confirme; no inventes datos.

# Estilo
Responde en el idioma del cliente (normalmente español), con calidez, claridad y sin rodeos.
Usa respuestas breves para preguntas simples y desarrolla más solo cuando el tema lo amerite.`;

// Esquema estructurado para extraer recetas oftálmicas de una foto.
const ESQUEMA_RECETA = {
  type: "object",
  properties: {
    legible: { type: "boolean", description: "true si la imagen contiene una receta oftálmica legible" },
    paciente: { type: ["string", "null"] },
    fecha: { type: ["string", "null"], description: "Fecha de la receta si aparece" },
    ojo_derecho: {
      type: "object",
      properties: {
        esfera: { type: ["string", "null"] },
        cilindro: { type: ["string", "null"] },
        eje: { type: ["string", "null"] },
        adicion: { type: ["string", "null"] }
      },
      required: ["esfera", "cilindro", "eje", "adicion"],
      additionalProperties: false
    },
    ojo_izquierdo: {
      type: "object",
      properties: {
        esfera: { type: ["string", "null"] },
        cilindro: { type: ["string", "null"] },
        eje: { type: ["string", "null"] },
        adicion: { type: ["string", "null"] }
      },
      required: ["esfera", "cilindro", "eje", "adicion"],
      additionalProperties: false
    },
    distancia_pupilar: { type: ["string", "null"] },
    observaciones: { type: ["string", "null"], description: "Notas del optometrista u otros datos relevantes" },
    tipo_lente_sugerido: {
      type: "string",
      enum: ["monofocal", "bifocal", "progresivo", "indeterminado"],
      description: "Según la receta: con adición usar bifocal/progresivo; sin adición, monofocal"
    },
    resumen: { type: "string", description: "Explicación breve y sencilla de la graduación para el cliente, en español" }
  },
  required: [
    "legible", "paciente", "fecha", "ojo_derecho", "ojo_izquierdo",
    "distancia_pupilar", "observaciones", "tipo_lente_sugerido", "resumen"
  ],
  additionalProperties: false
};

// Herramientas que la asistente puede usar durante la conversación.
const HERRAMIENTAS_CHAT = [
  {
    name: "consultar_disponibilidad",
    description:
      "Consulta los horarios libres para citas en la sucursal en una fecha dada. " +
      "Úsala antes de proponer horarios al cliente.",
    input_schema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "Fecha en formato AAAA-MM-DD" }
      },
      required: ["fecha"],
      additionalProperties: false
    }
  },
  {
    name: "agendar_cita",
    description:
      "Registra una cita real en la agenda de la sucursal. Úsala solo después de " +
      "confirmar con el cliente su nombre, teléfono, servicio, fecha y hora.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre completo del cliente" },
        telefono: { type: "string", description: "Teléfono de contacto" },
        servicio: { type: "string", enum: SERVICIOS },
        fecha: { type: "string", description: "Fecha AAAA-MM-DD" },
        hora: { type: "string", enum: HORARIOS }
      },
      required: ["nombre", "telefono", "servicio", "fecha", "hora"],
      additionalProperties: false
    }
  }
];

async function ejecutarHerramienta(nombre, entrada) {
  if (nombre === "consultar_disponibilidad") {
    return JSON.stringify(await disponibilidad(entrada.fecha));
  }
  if (nombre === "agendar_cita") {
    return JSON.stringify(await agendar(entrada));
  }
  return JSON.stringify({ error: "Herramienta desconocida." });
}

function limpiarHistorial(mensajes) {
  if (!Array.isArray(mensajes)) return [];
  return mensajes
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

// ---------- Asistente conversacional ----------
app.post("/api/chat", async (req, res) => {
  const mensajes = limpiarHistorial(req.body?.mensajes);
  if (mensajes.length === 0 || mensajes[mensajes.length - 1].role !== "user") {
    return res.status(400).json({ error: "Envía al menos un mensaje del usuario." });
  }
  if (!iaDisponible) {
    return res.json({
      offline: true,
      respuesta:
        "El asistente con IA no está configurado todavía (falta ANTHROPIC_API_KEY en el servidor). " +
        "Mientras tanto, puedes usar el probador virtual, la agenda de citas y el panel administrativo, " +
        "que funcionan sin conexión a la API."
    });
  }
  try {
    const conversacion = [...mensajes];
    let respuesta;
    // Bucle de herramientas: la asistente puede consultar la agenda y
    // registrar citas antes de dar su respuesta final.
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      respuesta = await client.messages.create({
        model: MODELO,
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SISTEMA_ASISTENTE,
            cache_control: { type: "ephemeral" }
          },
          {
            // Bloque volátil después del punto de caché: no invalida el prefijo.
            type: "text",
            text: `Hoy es ${new Date().toLocaleDateString("es-MX", {
              weekday: "long", year: "numeric", month: "long", day: "numeric"
            })}. Horarios de citas: ${HORARIOS.join(", ")}. Servicios: ${SERVICIOS.join(", ")}.`
          }
        ],
        tools: HERRAMIENTAS_CHAT,
        messages: conversacion
      });
      if (respuesta.stop_reason !== "tool_use") break;
      conversacion.push({ role: "assistant", content: respuesta.content });
      const resultados = [];
      for (const bloque of respuesta.content) {
        if (bloque.type === "tool_use") {
          resultados.push({
            type: "tool_result",
            tool_use_id: bloque.id,
            content: await ejecutarHerramienta(bloque.name, bloque.input)
          });
        }
      }
      conversacion.push({ role: "user", content: resultados });
    }
    if (respuesta.stop_reason === "refusal") {
      return res.json({
        respuesta:
          "No puedo ayudar con esa consulta. ¿Te apoyo con algo sobre lentes, armazones o tu cita?"
      });
    }
    const texto = respuesta.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    res.json({ respuesta: texto });
  } catch (err) {
    console.error("Error en /api/chat:", err);
    res.status(502).json({ error: "No se pudo obtener respuesta del asistente. Intenta de nuevo." });
  }
});

// ---------- Lectura de recetas con visión ----------
const TIPOS_IMAGEN = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

app.post("/api/receta", async (req, res) => {
  const { imagenBase64, mediaType } = req.body || {};
  if (!imagenBase64 || !TIPOS_IMAGEN.has(mediaType)) {
    return res.status(400).json({ error: "Envía una imagen JPEG, PNG o WebP en base64." });
  }
  if (!iaDisponible) {
    return res.json({
      offline: true,
      error:
        "La lectura automática de recetas requiere configurar ANTHROPIC_API_KEY en el servidor."
    });
  }
  try {
    const respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imagenBase64 }
            },
            {
              type: "text",
              text:
                "Extrae los datos de esta receta oftálmica. Si algún campo no aparece o no es legible, usa null. " +
                "Si la imagen no es una receta oftálmica, marca legible=false. Conserva los signos (+/-) de las graduaciones."
            }
          ]
        }
      ],
      output_config: { format: { type: "json_schema", schema: ESQUEMA_RECETA } }
    });
    if (respuesta.stop_reason === "refusal") {
      return res.status(422).json({ error: "No se pudo procesar la imagen enviada." });
    }
    const texto = respuesta.content.find((b) => b.type === "text")?.text ?? "{}";
    res.json({ receta: JSON.parse(texto) });
  } catch (err) {
    console.error("Error en /api/receta:", err);
    res.status(502).json({ error: "No se pudo leer la receta. Intenta con una foto más clara." });
  }
});

// ---------- Recomendación personalizada de armazones ----------
app.post("/api/recomendacion", async (req, res) => {
  const { formaRostro, distanciaPupilarMm, estiloVida } = req.body || {};
  if (!formaRostro) {
    return res.status(400).json({ error: "Falta la forma del rostro." });
  }
  if (!iaDisponible) {
    return res.json({ offline: true });
  }
  try {
    const respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 600,
      thinking: { type: "adaptive" },
      system: SISTEMA_ASISTENTE,
      messages: [
        {
          role: "user",
          content:
            `El probador virtual detectó: forma de rostro "${String(formaRostro).slice(0, 40)}"` +
            (distanciaPupilarMm ? `, distancia pupilar aproximada ${Number(distanciaPupilarMm)} mm` : "") +
            (estiloVida ? `. Estilo de vida del cliente: ${String(estiloVida).slice(0, 300)}` : "") +
            ". Da una recomendación breve (máximo 120 palabras) de estilos de armazón y tratamientos de mica que le convienen, en tono cercano."
        }
      ]
    });
    const texto = respuesta.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    res.json({ recomendacion: texto });
  } catch (err) {
    console.error("Error en /api/recomendacion:", err);
    res.status(502).json({ error: "No se pudo generar la recomendación." });
  }
});

// ---------- Agenda de citas ----------
app.get("/api/citas/disponibilidad", async (req, res) => {
  const r = await disponibilidad(String(req.query.fecha || ""));
  res.status(r.error ? 400 : 200).json(r);
});

app.post("/api/citas", async (req, res) => {
  const r = await agendar(req.body || {});
  res.status(r.error ? 400 : 201).json(r);
});

app.get("/api/citas", requiereAdmin, async (_req, res) => {
  const citas = await leerCitas();
  const hoy = new Date().toISOString().slice(0, 10);
  res.json({
    citas: citas
      .filter((c) => c.fecha >= hoy)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  });
});

// ---------- Expedientes clínicos ----------
app.post("/api/expedientes/receta", async (req, res) => {
  const r = await guardarReceta(req.body || {});
  res.status(r.error ? 400 : 201).json(r);
});

app.get("/api/expedientes", requiereAdmin, async (_req, res) => {
  res.json({ expedientes: await listarExpedientes() });
});

app.get("/api/expedientes/:id", requiereAdmin, async (req, res) => {
  const r = await obtenerExpediente(req.params.id);
  res.status(r.error ? 404 : 200).json(r);
});

// Estado del servidor (para que el frontend sepa si la IA está activa).
app.get("/api/estado", (_req, res) => {
  res.json({ ia: iaDisponible, modelo: iaDisponible ? MODELO : null });
});

app.listen(PORT, () => {
  console.log(`Ópticas Luisa escuchando en http://localhost:${PORT}`);
  if (!process.env.ADMIN_CLAVE) {
    console.log(
      "Aviso: ADMIN_CLAVE no está configurada en .env. Define una clave propia para proteger expedientes y citas."
    );
  }
  if (!iaDisponible) {
    console.log(
      "Aviso: ANTHROPIC_API_KEY no está configurada. El asistente y el lector de recetas responderán en modo sin conexión."
    );
  }
});
