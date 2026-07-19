// Expedientes clínicos (vista administrativa): lista de clientes, historial de
// recetas y comparación automática de graduaciones entre visitas.
(() => {
  const lista = document.getElementById("listaClientes");
  const detalle = document.getElementById("detalle");

  function celda(v) {
    return v == null || v === "" ? "—" : v;
  }
  function fechaBonita(iso) {
    return iso
      ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
      : "—";
  }

  async function cargarLista() {
    try {
      const r = await fetch("/api/expedientes");
      const { expedientes } = await r.json();
      if (!expedientes.length) {
        lista.innerHTML = `<p class="sub">Aún no hay expedientes. Se crean cuando un cliente guarda su
          receta desde el <a href="receta.html">lector de recetas</a>.</p>`;
        return;
      }
      lista.innerHTML = `
        <table class="datos">
          <thead><tr><th>Cliente</th><th>Teléfono</th><th style="text-align:right">Recetas</th><th>Última receta</th><th>Alerta</th></tr></thead>
          <tbody>${expedientes
            .map(
              (c) => `<tr class="cliente" data-id="${c.id}">
                <td>${c.nombre}</td><td>${c.telefono}</td>
                <td class="num">${c.totalRecetas}</td>
                <td>${fechaBonita(c.ultimaReceta)}</td>
                <td>${c.comparacion?.alerta ? "⚠️ Cambio importante" : ""}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>
        <p class="sub" style="margin-top:8px">Haz clic en un cliente para ver su historial.</p>`;
      lista.querySelectorAll("tr.cliente").forEach((tr) =>
        tr.addEventListener("click", () => cargarDetalle(tr.dataset.id))
      );
    } catch {
      lista.innerHTML = `<p class="sub">No se pudieron cargar los expedientes.</p>`;
    }
  }

  async function cargarDetalle(id) {
    const r = await fetch(`/api/expedientes/${id}`);
    const c = await r.json();
    if (c.error) return;
    const filasRecetas = c.recetas
      .map(
        (rec, i) => `<tr>
          <td>#${i + 1} · ${fechaBonita(rec.registrada)}</td>
          <td class="num">${celda(rec.ojo_derecho.esfera)} / ${celda(rec.ojo_derecho.cilindro)} × ${celda(rec.ojo_derecho.eje)}</td>
          <td class="num">${celda(rec.ojo_izquierdo.esfera)} / ${celda(rec.ojo_izquierdo.cilindro)} × ${celda(rec.ojo_izquierdo.eje)}</td>
          <td class="num">${celda(rec.distancia_pupilar)}</td>
          <td>${celda(rec.tipo_lente_sugerido)}</td>
        </tr>`
      )
      .join("");

    let comparacionHtml = `<p class="sub">Se necesitan al menos dos recetas para comparar la evolución.</p>`;
    if (c.comparacion) {
      const filas = c.comparacion.cambios
        .map(
          (cb) => `<tr>
            <td>${cb.ojo} · ${cb.campo}</td>
            <td class="num">${cb.anterior.toFixed(2)}</td>
            <td class="num">${cb.actual.toFixed(2)}</td>
            <td class="num"><span class="cambio ${cb.importante ? "importante" : "leve"}">${cb.delta > 0 ? "+" : ""}${cb.delta.toFixed(2)} D</span></td>
          </tr>`
        )
        .join("");
      comparacionHtml = c.comparacion.cambios.length
        ? `<table class="datos">
            <thead><tr><th>Medida</th><th style="text-align:right">Anterior</th><th style="text-align:right">Actual</th><th style="text-align:right">Cambio</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
          ${c.comparacion.alerta ? `<p class="aviso" style="margin-top:10px;border-left-color:var(--alerta)">⚠️ ${c.comparacion.alerta}</p>` : ""}`
        : `<p class="sub">Sin cambios de graduación entre las dos últimas recetas. 👌</p>`;
    }

    detalle.classList.remove("oculto");
    detalle.innerHTML = `
      <h2>${c.nombre} · ${c.telefono}</h2>
      <h3>Historial de recetas</h3>
      <table class="datos">
        <thead><tr><th>Registro</th><th style="text-align:right">OD (esf/cil × eje)</th><th style="text-align:right">OI (esf/cil × eje)</th><th style="text-align:right">DP</th><th>Lente</th></tr></thead>
        <tbody>${filasRecetas}</tbody>
      </table>
      <h3 style="margin-top:16px">Evolución de la graduación (últimas dos recetas)</h3>
      ${comparacionHtml}`;
    detalle.scrollIntoView({ behavior: "smooth" });
  }

  cargarLista();
})();
