// Expedientes clínicos: recetas digitalizadas por cliente y comparación
// automática de graduaciones entre visitas.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO = path.join(__dirname, "datos", "expedientes.json");

async function leerExpedientes() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, "utf8"));
  } catch {
    return [];
  }
}

async function guardarExpedientes(exp) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(exp, null, 2));
}

function normalizarTelefono(t) {
  return String(t || "").replace(/\D/g, "");
}

async function guardarReceta({ nombre, telefono, receta }) {
  if (!nombre || String(nombre).trim().length < 3) return { error: "Falta el nombre completo." };
  const tel = normalizarTelefono(telefono);
  if (tel.length < 8) return { error: "Teléfono inválido." };
  if (!receta || typeof receta !== "object" || !receta.ojo_derecho) {
    return { error: "Falta la receta digitalizada." };
  }
  const expedientes = await leerExpedientes();
  let cliente = expedientes.find((c) => c.telefono === tel);
  if (!cliente) {
    cliente = {
      id: "cli_" + Date.now().toString(36),
      nombre: String(nombre).trim().slice(0, 80),
      telefono: tel,
      recetas: []
    };
    expedientes.push(cliente);
  }
  cliente.recetas.push({
    registrada: new Date().toISOString(),
    fecha: receta.fecha ?? null,
    ojo_derecho: receta.ojo_derecho,
    ojo_izquierdo: receta.ojo_izquierdo,
    distancia_pupilar: receta.distancia_pupilar ?? null,
    tipo_lente_sugerido: receta.tipo_lente_sugerido ?? null,
    observaciones: receta.observaciones ?? null
  });
  await guardarExpedientes(expedientes);
  return { clienteId: cliente.id, totalRecetas: cliente.recetas.length };
}

function aNumero(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(",", ".").replace(/[^\d+\-.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

// Compara las dos recetas más recientes de un cliente y señala cambios.
function compararRecetas(cliente) {
  if (cliente.recetas.length < 2) return null;
  const [previa, actual] = cliente.recetas.slice(-2);
  const cambios = [];
  for (const [ojo, etiqueta] of [["ojo_derecho", "OD"], ["ojo_izquierdo", "OI"]]) {
    for (const [campo, nombre] of [["esfera", "esfera"], ["cilindro", "cilindro"]]) {
      const a = aNumero(previa[ojo]?.[campo]);
      const b = aNumero(actual[ojo]?.[campo]);
      if (a == null || b == null) continue;
      const delta = +(b - a).toFixed(2);
      if (delta !== 0) {
        cambios.push({
          ojo: etiqueta,
          campo: nombre,
          anterior: a,
          actual: b,
          delta,
          importante: Math.abs(delta) >= 0.5
        });
      }
    }
  }
  return {
    fechaPrevia: previa.registrada,
    fechaActual: actual.registrada,
    cambios,
    alerta: cambios.some((c) => c.importante)
      ? "Cambio de graduación de 0.50 D o más: conviene revisar la salud visual del cliente."
      : null
  };
}

async function listarExpedientes() {
  const expedientes = await leerExpedientes();
  return expedientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    totalRecetas: c.recetas.length,
    ultimaReceta: c.recetas.at(-1)?.registrada ?? null,
    comparacion: compararRecetas(c)
  }));
}

async function obtenerExpediente(id) {
  const expedientes = await leerExpedientes();
  const cliente = expedientes.find((c) => c.id === id);
  if (!cliente) return { error: "Expediente no encontrado." };
  return { ...cliente, comparacion: compararRecetas(cliente) };
}

export { guardarReceta, listarExpedientes, obtenerExpediente };
