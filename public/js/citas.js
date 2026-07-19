// Agenda de citas: días disponibles, horarios libres consultados al servidor
// y registro de la cita.
(() => {
  const contDias = document.getElementById("dias");
  const contHoras = document.getElementById("horas");
  const estadoHoras = document.getElementById("estadoHoras");
  const btnAgendar = document.getElementById("btnAgendar");
  const errorCita = document.getElementById("errorCita");
  let fechaSel = null;
  let horaSel = null;

  // Próximos 14 días hábiles (domingo cerrado)
  const hoy = new Date();
  for (let i = 0; contDias.childElementCount < 12 && i < 15; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (d.getDay() === 0) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML =
      d.toLocaleDateString("es-MX", { weekday: "short" }) +
      `<small>${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</small>`;
    b.dataset.fecha = d.toISOString().slice(0, 10);
    b.addEventListener("click", () => elegirDia(b));
    contDias.appendChild(b);
  }

  async function elegirDia(boton) {
    contDias.querySelectorAll("button").forEach((x) => x.classList.remove("activo"));
    boton.classList.add("activo");
    fechaSel = boton.dataset.fecha;
    horaSel = null;
    btnAgendar.disabled = true;
    contHoras.innerHTML = "";
    estadoHoras.textContent = "Consultando horarios…";
    try {
      const r = await fetch(`/api/citas/disponibilidad?fecha=${fechaSel}`);
      const datos = await r.json();
      if (datos.error) {
        estadoHoras.textContent = datos.error;
        return;
      }
      if (datos.horariosLibres.length === 0) {
        estadoHoras.textContent = "Ese día ya no hay horarios; elige otro.";
        return;
      }
      estadoHoras.textContent = "";
      for (const h of datos.horariosLibres) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = h;
        b.addEventListener("click", () => {
          contHoras.querySelectorAll("button").forEach((x) => x.classList.remove("activo"));
          b.classList.add("activo");
          horaSel = h;
          btnAgendar.disabled = false;
        });
        contHoras.appendChild(b);
      }
    } catch {
      estadoHoras.textContent = "No se pudo consultar la disponibilidad.";
    }
  }

  document.getElementById("formCita").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!fechaSel || !horaSel) return;
    errorCita.textContent = "";
    btnAgendar.disabled = true;
    try {
      const r = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: document.getElementById("nombre").value,
          telefono: document.getElementById("telefono").value,
          servicio: document.getElementById("servicio").value,
          fecha: fechaSel,
          hora: horaSel
        })
      });
      const datos = await r.json();
      if (datos.error) {
        errorCita.textContent = datos.error;
        btnAgendar.disabled = false;
        // El horario pudo ocuparse mientras tanto: refrescar
        const activo = contDias.querySelector("button.activo");
        if (activo) elegirDia(activo);
        return;
      }
      const c = datos.cita;
      const fechaBonita = new Date(c.fecha + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long"
      });
      document.getElementById("resumenCita").textContent =
        `${c.nombre}, tu cita de ${c.servicio} quedó agendada el ${fechaBonita} a las ${c.hora}. ` +
        `Folio: ${c.id}.`;
      document.getElementById("confirmacion").classList.remove("oculto");
      document.getElementById("confirmacion").scrollIntoView({ behavior: "smooth" });
      // Refrescar los horarios para que el recién reservado ya no aparezca
      const activo = contDias.querySelector("button.activo");
      if (activo) elegirDia(activo);
    } catch {
      errorCita.textContent = "No se pudo contactar al servidor.";
      btnAgendar.disabled = false;
    }
  });
})();
