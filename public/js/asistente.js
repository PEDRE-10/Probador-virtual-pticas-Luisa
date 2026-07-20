// Chat con Luisa (Claude vía el servidor) — interfaz animada.
(() => {
  const conversacion = document.getElementById("conversacion");
  const formulario = document.getElementById("formulario");
  const entrada = document.getElementById("entrada");
  const historial = [];

  const AVATAR_SVG = document.getElementById("avatarLuisa").innerHTML;

  agregarBurbuja(
    "asistente",
    "¡Hola! Soy Luisa, tu asistente de Ópticas Luisa. 👋✨\n" +
      "Puedo recomendarte armazones según tu rostro, explicarte tu graduación, resolver " +
      "cualquier duda y agendar tu cita en un minuto. ¿Por dónde empezamos?"
  );

  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto) return;
    entrada.value = "";
    await enviar(texto);
  });

  document.querySelectorAll(".sugerencias button").forEach((b) =>
    b.addEventListener("click", () => enviar(b.textContent.replace(/^[^\s]+\s/, "")))
  );

  async function enviar(texto) {
    agregarBurbuja("usuario", texto);
    historial.push({ role: "user", content: texto });
    const espera = agregarEscribiendo();
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: historial })
      });
      const datos = await r.json();
      espera.remove();
      const respuesta = datos.respuesta || datos.error || "No obtuve respuesta, intenta de nuevo.";
      agregarBurbuja("asistente", respuesta);
      if (!datos.offline && datos.respuesta) {
        historial.push({ role: "assistant", content: datos.respuesta });
      } else if (datos.offline) {
        historial.pop(); // sin IA no acumulamos historial
      }
    } catch {
      espera.remove();
      agregarBurbuja("asistente", "No pude conectar con el servidor. Intenta de nuevo en un momento. 🙏");
      historial.pop();
    }
  }

  function filaBase(clase) {
    const fila = document.createElement("div");
    fila.className = "fila " + clase;
    if (clase.startsWith("asistente")) {
      const avatar = document.createElement("div");
      avatar.className = "mini-avatar";
      avatar.innerHTML = AVATAR_SVG;
      fila.appendChild(avatar);
    }
    return fila;
  }

  function agregarBurbuja(clase, texto) {
    const fila = filaBase(clase);
    const div = document.createElement("div");
    div.className = "burbuja";
    div.textContent = texto;
    fila.appendChild(div);
    conversacion.appendChild(fila);
    conversacion.scrollTop = conversacion.scrollHeight;
    return fila;
  }

  function agregarEscribiendo() {
    const fila = filaBase("asistente");
    const div = document.createElement("div");
    div.className = "burbuja";
    div.innerHTML = `<span class="puntos"><i></i><i></i><i></i></span>`;
    fila.appendChild(div);
    conversacion.appendChild(fila);
    conversacion.scrollTop = conversacion.scrollHeight;
    return fila;
  }
})();
