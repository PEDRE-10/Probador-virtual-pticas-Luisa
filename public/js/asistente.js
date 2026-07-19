// Chat con la asistente virtual (Claude vía el servidor).
(() => {
  const conversacion = document.getElementById("conversacion");
  const formulario = document.getElementById("formulario");
  const entrada = document.getElementById("entrada");
  const historial = [];

  agregarBurbuja(
    "asistente",
    "¡Hola! Soy Luisa, la asistente virtual de Ópticas Luisa. 👋\n" +
      "Puedo explicarte tu graduación, recomendarte lentes y armazones, o ayudarte a agendar una cita. ¿En qué te apoyo?"
  );

  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto) return;
    entrada.value = "";
    await enviar(texto);
  });

  document.querySelectorAll(".sugerencias button").forEach((b) =>
    b.addEventListener("click", () => enviar(b.textContent))
  );

  async function enviar(texto) {
    agregarBurbuja("usuario", texto);
    historial.push({ role: "user", content: texto });
    const espera = agregarBurbuja("asistente escribiendo", "Luisa está escribiendo…");
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
      agregarBurbuja("asistente", "No pude conectar con el servidor. Verifica que esté encendido.");
      historial.pop();
    }
  }

  function agregarBurbuja(clase, texto) {
    const div = document.createElement("div");
    div.className = "burbuja " + clase;
    div.textContent = texto;
    conversacion.appendChild(div);
    conversacion.scrollTop = conversacion.scrollHeight;
    return div;
  }
})();
