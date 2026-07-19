// Lector de recetas: redimensiona la foto en el navegador y la envía al
// servidor, donde Claude extrae la graduación con salida estructurada.
(() => {
  const zona = document.getElementById("zonaSoltar");
  const archivo = document.getElementById("archivo");
  const vista = document.getElementById("vistaPrevia");
  const btnLeer = document.getElementById("btnLeer");
  const estado = document.getElementById("estadoReceta");
  let imagenBase64 = null;
  let recetaActual = null;

  zona.addEventListener("click", () => archivo.click());
  zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => {
    e.preventDefault();
    zona.classList.remove("encima");
    if (e.dataTransfer.files[0]) cargarImagen(e.dataTransfer.files[0]);
  });
  archivo.addEventListener("change", () => {
    if (archivo.files[0]) cargarImagen(archivo.files[0]);
  });

  function cargarImagen(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      estado.textContent = "Formato no compatible. Usa JPG, PNG o WebP.";
      return;
    }
    const img = new Image();
    img.onload = () => {
      // Reducir a máximo 1600 px por lado para acelerar el envío
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.9);
      imagenBase64 = dataUrl.split(",")[1];
      vista.src = dataUrl;
      vista.classList.remove("oculto");
      btnLeer.classList.remove("oculto");
      estado.textContent = "";
      document.getElementById("resultado").classList.add("oculto");
    };
    img.src = URL.createObjectURL(f);
  }

  btnLeer.addEventListener("click", async () => {
    if (!imagenBase64) return;
    btnLeer.disabled = true;
    estado.textContent = "Analizando la receta con IA… (puede tardar unos segundos)";
    try {
      const r = await fetch("/api/receta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64, mediaType: "image/jpeg" })
      });
      const datos = await r.json();
      if (datos.offline) {
        estado.textContent = datos.error;
        return;
      }
      if (datos.error) {
        estado.textContent = datos.error;
        return;
      }
      mostrarReceta(datos.receta);
      estado.textContent = "";
    } catch {
      estado.textContent = "No se pudo contactar al servidor.";
    } finally {
      btnLeer.disabled = false;
    }
  });

  function celda(v) {
    return v == null || v === "" ? "—" : v;
  }

  function mostrarReceta(rec) {
    if (!rec.legible) {
      estado.textContent =
        "La IA no encontró una receta legible en la imagen. Intenta con una foto más clara y bien iluminada.";
      return;
    }
    document.getElementById("tablaReceta").innerHTML = `
      <table class="datos">
        <thead><tr><th>Ojo</th><th>Esfera</th><th>Cilindro</th><th>Eje</th><th>Adición</th></tr></thead>
        <tbody>
          <tr><td>Derecho (OD)</td><td class="num">${celda(rec.ojo_derecho.esfera)}</td><td class="num">${celda(rec.ojo_derecho.cilindro)}</td><td class="num">${celda(rec.ojo_derecho.eje)}</td><td class="num">${celda(rec.ojo_derecho.adicion)}</td></tr>
          <tr><td>Izquierdo (OI)</td><td class="num">${celda(rec.ojo_izquierdo.esfera)}</td><td class="num">${celda(rec.ojo_izquierdo.cilindro)}</td><td class="num">${celda(rec.ojo_izquierdo.eje)}</td><td class="num">${celda(rec.ojo_izquierdo.adicion)}</td></tr>
        </tbody>
      </table>
      <p class="sub" style="margin-top:10px">
        Paciente: ${celda(rec.paciente)} · Fecha: ${celda(rec.fecha)} ·
        Distancia pupilar: ${celda(rec.distancia_pupilar)} ·
        Tipo de lente sugerido: <strong>${celda(rec.tipo_lente_sugerido)}</strong>
      </p>
      ${rec.observaciones ? `<p class="sub">Observaciones: ${rec.observaciones}</p>` : ""}`;
    document.getElementById("resumenReceta").textContent = rec.resumen || "";
    document.getElementById("resultado").classList.remove("oculto");
    recetaActual = rec;
    if (rec.paciente) document.getElementById("expNombre").value = rec.paciente;
    // Nota: la receta no se guarda en el navegador del cliente por política de
    // la óptica; solo queda en el expediente interno si el cliente la registra.
  }

  // Guardado de la receta en el expediente clínico del cliente
  document.getElementById("btnGuardarExp").addEventListener("click", async () => {
    const estadoExp = document.getElementById("estadoExp");
    if (!recetaActual) return;
    estadoExp.textContent = "Guardando…";
    try {
      const r = await fetch("/api/expedientes/receta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: document.getElementById("expNombre").value,
          telefono: document.getElementById("expTelefono").value,
          receta: recetaActual
        })
      });
      const datos = await r.json();
      estadoExp.textContent = datos.error
        ? datos.error
        : `✅ Guardada. Tu expediente ya tiene ${datos.totalRecetas} receta(s) registradas.`;
    } catch {
      estadoExp.textContent = "No se pudo contactar al servidor.";
    }
  });
})();
