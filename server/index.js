// Servidor de Ópticas Luisa — expone la interfaz web y los servicios de IA
// (asistente conversacional, lectura de recetas con visión y recomendaciones).
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Las recetas llegan como imagen base64 dentro del JSON.
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const iaDisponible = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
);
const client = iaDisponible ? new Anthropic() : null;
const MODELO = "claude-opus-4-8";

const SISTEMA_ASISTENTE = `Eres "Luisa", la asistente virtual de Ópticas Luisa, una óptica mexicana.
Tu trabajo:
- Orientar sobre tipos de lentes (monofocales, bifocales, progresivos), tratamientos (antirreflejante, fotocromático, filtro de luz azul), armazones y lentes de contacto.
- Explicar en lenguaje sencillo términos de recetas oftálmicas (esfera, cilindro, eje, adición, distancia pupilar).
- Ayudar a agendar una cita: pide nombre, teléfono y horario preferido, y confirma que un asesor se comunicará.
- Recomendar armazones según la forma del rostro (ovalado, redondo, cuadrado, corazón, alargado).
- Responder siempre en español, con calidez y brevedad.

Reglas importantes:
- NO das diagnósticos médicos. Ante síntomas (dolor ocular, visión súbitamente borrosa, destellos, ojo rojo), recomienda acudir de inmediato con el optometrista u oftalmólogo.
- Los resultados del pre-examen visual en línea son orientativos y nunca sustituyen un examen profesional.
- Si no sabes algo específico de la sucursal (precios exactos, inventario), ofrece que un asesor confirme el dato.`;

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
        "Mientras tanto, puedes usar el probador virtual, el pre-examen visual y el panel administrativo, " +
        "que funcionan sin conexión a la API."
    });
  }
  try {
    const respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: SISTEMA_ASISTENTE,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: mensajes
    });
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

// Estado del servidor (para que el frontend sepa si la IA está activa).
app.get("/api/estado", (_req, res) => {
  res.json({ ia: iaDisponible, modelo: iaDisponible ? MODELO : null });
});

app.listen(PORT, () => {
  console.log(`Ópticas Luisa escuchando en http://localhost:${PORT}`);
  if (!iaDisponible) {
    console.log(
      "Aviso: ANTHROPIC_API_KEY no está configurada. El asistente y el lector de recetas responderán en modo sin conexión."
    );
  }
});
