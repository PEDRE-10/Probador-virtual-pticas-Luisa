// Módulo de citas: almacenamiento en archivo JSON y reglas de disponibilidad.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO = path.join(__dirname, "datos", "citas.json");

const HORARIOS = ["10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00"];
const SERVICIOS = ["examen de la vista", "ajuste de armazón", "entrega de lentes", "adaptación de lentes de contacto"];
const DIAS_MAX = 30; // se puede agendar hasta 30 días adelante

async function leerCitas() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, "utf8"));
  } catch {
    return [];
  }
}

async function guardarCitas(citas) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(citas, null, 2));
}

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) return "Formato de fecha inválido (usa AAAA-MM-DD).";
  const f = new Date(fecha + "T12:00:00");
  if (Number.isNaN(f.getTime())) return "Fecha inválida.";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + DIAS_MAX);
  if (f < hoy) return "La fecha ya pasó.";
  if (f > limite) return `Solo agendamos hasta ${DIAS_MAX} días adelante.`;
  if (f.getDay() === 0) return "Los domingos la sucursal está cerrada.";
  return null;
}

async function disponibilidad(fecha) {
  const error = validarFecha(fecha);
  if (error) return { error };
  const citas = await leerCitas();
  const ocupados = citas.filter((c) => c.fecha === fecha).map((c) => c.hora);
  return { fecha, horariosLibres: HORARIOS.filter((h) => !ocupados.includes(h)) };
}

async function agendar({ nombre, telefono, servicio, fecha, hora }) {
  if (!nombre || String(nombre).trim().length < 3) return { error: "Falta el nombre completo." };
  if (!/^[\d\s+\-()]{8,20}$/.test(String(telefono || ""))) return { error: "Teléfono inválido." };
  if (!SERVICIOS.includes(servicio)) return { error: `Servicio inválido. Opciones: ${SERVICIOS.join(", ")}.` };
  const errorFecha = validarFecha(fecha);
  if (errorFecha) return { error: errorFecha };
  if (!HORARIOS.includes(hora)) return { error: `Horario inválido. Opciones: ${HORARIOS.join(", ")}.` };

  const citas = await leerCitas();
  if (citas.some((c) => c.fecha === fecha && c.hora === hora)) {
    const libre = await disponibilidad(fecha);
    return { error: `Ese horario ya está ocupado. Horarios libres el ${fecha}: ${libre.horariosLibres.join(", ") || "ninguno"}.` };
  }
  const cita = {
    id: "cita_" + Date.now().toString(36),
    nombre: String(nombre).trim().slice(0, 80),
    telefono: String(telefono).trim().slice(0, 20),
    servicio,
    fecha,
    hora,
    creada: new Date().toISOString(),
    origen: "web"
  };
  citas.push(cita);
  await guardarCitas(citas);
  return { cita };
}

export { leerCitas, disponibilidad, agendar, HORARIOS, SERVICIOS };
