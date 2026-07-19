// Panel administrativo con datos de demostración: KPIs, gráfica de ventas con
// pronóstico, ventas por categoría, alertas de inventario y recall de clientes.
(() => {
  const tooltip = document.getElementById("tooltip");

  // ---------- Datos de demostración (semilla fija para que sean estables) ----------
  let semilla = 42;
  function aleatorio() {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  }

  const DIAS = 30;
  const hoy = new Date();
  const ventas = [];
  for (let i = DIAS - 1; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const diaSemana = fecha.getDay();
    // Base con tendencia ligera + estacionalidad semanal (sábado fuerte, domingo cerrado a medio día)
    const base = 5200 + (DIAS - i) * 35;
    const estacional = [0.55, 0.85, 0.9, 0.95, 1.0, 1.15, 1.45][diaSemana];
    ventas.push({
      fecha,
      total: Math.round(base * estacional * (0.85 + aleatorio() * 0.3))
    });
  }

  const categorias = [
    { nombre: "Armazones oftálmicos", corto: "Armazones", total: 86200 },
    { nombre: "Lentes de sol", corto: "De sol", total: 41300 },
    { nombre: "Lentes de contacto", corto: "Contacto", total: 28900 },
    { nombre: "Micas y tratamientos", corto: "Micas", total: 52400 },
    { nombre: "Accesorios", corto: "Accesorios", total: 9800 }
  ];

  const inventario = [
    { producto: "Mica antirreflejante 1.56", stock: 14, ventaDiaria: 2.1 },
    { producto: "Armazón Urbano Rectangular", stock: 6, ventaDiaria: 0.9 },
    { producto: "Lente de contacto mensual -2.00", stock: 22, ventaDiaria: 1.4 },
    { producto: "Solución multipropósito 360 ml", stock: 9, ventaDiaria: 1.8 },
    { producto: "Armazón Cat-Eye Rubí", stock: 11, ventaDiaria: 0.5 }
  ];

  const clientes = [
    { nombre: "María González", telefono: "555-201-8834", ultimoExamen: mesesAtras(13) },
    { nombre: "Jorge Ramírez", telefono: "555-118-2201", ultimoExamen: mesesAtras(12) },
    { nombre: "Lucía Fernández", telefono: "555-902-4417", ultimoExamen: mesesAtras(15) },
    { nombre: "Andrés Peña", telefono: "555-345-9082", ultimoExamen: mesesAtras(11.5) },
    { nombre: "Carmen Salas", telefono: "555-770-1265", ultimoExamen: mesesAtras(18) }
  ];

  function mesesAtras(m) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - Math.round(m * 30.4));
    return d;
  }

  // ---------- Pronóstico: tendencia lineal (14 días) + estacionalidad semanal ----------
  function pronosticar(dias) {
    const ultimos = ventas.slice(-14);
    const n = ultimos.length;
    const promedio = ultimos.reduce((s, v) => s + v.total, 0) / n;
    // Pendiente por mínimos cuadrados sobre el índice del día
    let sxy = 0, sxx = 0;
    ultimos.forEach((v, i) => {
      const x = i - (n - 1) / 2;
      sxy += x * (v.total - promedio);
      sxx += x * x;
    });
    const pendiente = sxy / sxx;
    // Factores por día de la semana calculados sobre los 30 días
    const factores = {};
    const conteos = {};
    const promedioGlobal = ventas.reduce((s, v) => s + v.total, 0) / ventas.length;
    for (const v of ventas) {
      const d = v.fecha.getDay();
      factores[d] = (factores[d] || 0) + v.total / promedioGlobal;
      conteos[d] = (conteos[d] || 0) + 1;
    }
    const resultado = [];
    for (let i = 1; i <= dias; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const nivel = promedio + pendiente * ((n - 1) / 2 + i);
      const factor = factores[fecha.getDay()] / conteos[fecha.getDay()];
      resultado.push({ fecha, total: Math.round(nivel * factor) });
    }
    return resultado;
  }
  const pronostico = pronosticar(7);

  // ---------- KPIs ----------
  const semanaActual = ventas.slice(-7).reduce((s, v) => s + v.total, 0);
  const semanaPrevia = ventas.slice(-14, -7).reduce((s, v) => s + v.total, 0);
  const deltaSemana = ((semanaActual - semanaPrevia) / semanaPrevia) * 100;
  const proyeccionSemana = pronostico.reduce((s, v) => s + v.total, 0);
  const ticketPromedio = Math.round(semanaActual / (7 * 6.2));

  const kpis = [
    { titulo: "Ventas últimos 7 días", valor: moneda(semanaActual), delta: deltaSemana },
    { titulo: "Pronóstico próximos 7 días", valor: moneda(proyeccionSemana), nota: "modelo tendencia + estacionalidad" },
    { titulo: "Ticket promedio", valor: moneda(ticketPromedio), nota: "por venta" },
    { titulo: "Clientes por contactar", valor: String(clientes.length), nota: "renovación de lentes" }
  ];
  document.getElementById("kpis").innerHTML = kpis
    .map((k) => {
      const delta =
        k.delta != null
          ? `<div class="delta ${k.delta >= 0 ? "sube" : "baja"}">${k.delta >= 0 ? "▲" : "▼"} ${Math.abs(k.delta).toFixed(1)} % vs semana previa</div>`
          : `<div class="delta" style="color:var(--tinta-suave)">${k.nota}</div>`;
      return `<div class="kpi"><div class="titulo">${k.titulo}</div><div class="valor">${k.valor}</div>${delta}</div>`;
    })
    .join("");

  function moneda(v) {
    return "$" + v.toLocaleString("es-MX");
  }

  // ---------- Gráfica de líneas: ventas + pronóstico ----------
  (function graficaVentas() {
    const W = 920, H = 300, m = { sup: 16, der: 70, inf: 30, izq: 56 };
    const serie = ventas.map((v) => ({ ...v, tipo: "real" }));
    const futuro = [{ ...ventas[ventas.length - 1], tipo: "real" }, ...pronostico.map((v) => ({ ...v, tipo: "pron" }))];
    const todos = [...serie, ...pronostico];
    const maxY = Math.max(...todos.map((v) => v.total)) * 1.08;
    const x = (i) => m.izq + (i / (DIAS + 7 - 1)) * (W - m.izq - m.der);
    const y = (v) => m.sup + (1 - v / maxY) * (H - m.sup - m.inf);

    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas diarias de los últimos 30 días y pronóstico de 7 días">`;
    // Rejilla horizontal (líneas finas y discretas)
    for (let g = 1; g <= 4; g++) {
      const gy = m.sup + (g / 4) * (H - m.sup - m.inf);
      const val = Math.round(maxY * (1 - g / 4));
      s += `<line x1="${m.izq}" y1="${gy}" x2="${W - m.der}" y2="${gy}" stroke="var(--linea)" stroke-width="1"/>`;
      s += `<text x="${m.izq - 8}" y="${gy + 4}" text-anchor="end" font-size="11" fill="var(--tinta-suave)" style="font-variant-numeric:tabular-nums">${(val / 1000).toFixed(0)}k</text>`;
    }
    // Eje base
    s += `<line x1="${m.izq}" y1="${H - m.inf}" x2="${W - m.der}" y2="${H - m.inf}" stroke="var(--linea)" stroke-width="1"/>`;
    // Etiquetas de fecha (cada 7 días)
    for (let i = 0; i < DIAS; i += 7) {
      s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--tinta-suave)">${etiquetaFecha(ventas[i].fecha)}</text>`;
    }
    s += `<text x="${x(DIAS + 6)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--tinta-suave)">${etiquetaFecha(pronostico[6].fecha)}</text>`;
    // Línea de ventas reales
    s += `<path d="${serie.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v.total)).join(" ")}" fill="none" stroke="var(--serie-1)" stroke-width="2" stroke-linejoin="round"/>`;
    // Pronóstico punteado
    s += `<path d="${futuro.map((v, i) => (i ? "L" : "M") + x(DIAS - 1 + i) + " " + y(v.total)).join(" ")}" fill="none" stroke="var(--serie-2)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>`;
    // Etiquetas directas al final de cada línea
    s += `<text x="${x(DIAS - 1) - 8}" y="${y(serie[DIAS - 1].total) - 10}" text-anchor="end" font-size="11" font-weight="600" fill="var(--tinta-2)">Reales</text>`;
    s += `<text x="${x(DIAS + 6)}" y="${y(pronostico[6].total) - 12}" text-anchor="end" font-size="11" font-weight="600" fill="var(--tinta-2)">Pronóstico</text>`;
    // Capa interactiva: guía vertical + punto
    s += `<line id="guia" y1="${m.sup}" y2="${H - m.inf}" stroke="var(--tinta-suave)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>`;
    s += `<circle id="punto" r="5" fill="var(--serie-1)" stroke="var(--superficie)" stroke-width="2" visibility="hidden"/>`;
    s += `<rect id="zona" x="${m.izq}" y="${m.sup}" width="${W - m.izq - m.der}" height="${H - m.sup - m.inf}" fill="transparent"/>`;
    s += `</svg>`;

    const cont = document.getElementById("graficaVentas");
    cont.innerHTML = s;
    const svg = cont.querySelector("svg");
    const zona = svg.querySelector("#zona");
    const guia = svg.querySelector("#guia");
    const punto = svg.querySelector("#punto");
    zona.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.round(((px - m.izq) / (W - m.izq - m.der)) * (DIAS + 7 - 1));
      const dato = i < DIAS ? ventas[i] : pronostico[i - DIAS];
      if (!dato) return;
      const gx = x(i), gy = y(dato.total);
      guia.setAttribute("x1", gx); guia.setAttribute("x2", gx);
      guia.setAttribute("visibility", "visible");
      punto.setAttribute("cx", gx); punto.setAttribute("cy", gy);
      punto.setAttribute("fill", i < DIAS ? "var(--serie-1)" : "var(--serie-2)");
      punto.setAttribute("visibility", "visible");
      mostrarTooltip(e, `${dato.fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}<br><strong>${moneda(dato.total)}</strong> ${i < DIAS ? "" : "(pronóstico)"}`);
    });
    zona.addEventListener("mouseleave", () => {
      guia.setAttribute("visibility", "hidden");
      punto.setAttribute("visibility", "hidden");
      tooltip.style.display = "none";
    });
  })();

  function etiquetaFecha(f) {
    return f.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }

  // ---------- Gráfica de barras: categorías ----------
  (function graficaCategorias() {
    const W = 460, H = 260, m = { sup: 12, der: 14, inf: 66, izq: 50 };
    const maxY = Math.max(...categorias.map((c) => c.total)) * 1.1;
    const anchoBanda = (W - m.izq - m.der) / categorias.length;
    const anchoBarra = anchoBanda - 14;
    const y = (v) => m.sup + (1 - v / maxY) * (H - m.sup - m.inf);

    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas del mes por categoría">`;
    for (let g = 1; g <= 3; g++) {
      const gy = m.sup + (g / 3) * (H - m.sup - m.inf);
      s += `<line x1="${m.izq}" y1="${gy}" x2="${W - m.der}" y2="${gy}" stroke="var(--linea)" stroke-width="1"/>`;
      s += `<text x="${m.izq - 6}" y="${gy + 4}" text-anchor="end" font-size="10" fill="var(--tinta-suave)" style="font-variant-numeric:tabular-nums">${Math.round((maxY * (1 - g / 3)) / 1000)}k</text>`;
    }
    const maxCat = categorias.reduce((a, b) => (a.total > b.total ? a : b));
    categorias.forEach((c, i) => {
      const bx = m.izq + i * anchoBanda + 7;
      const by = y(c.total);
      const bh = H - m.inf - by;
      s += `<path class="barra" data-i="${i}" d="M${bx} ${H - m.inf} V${by + 4} Q${bx} ${by} ${bx + 4} ${by} H${bx + anchoBarra - 4} Q${bx + anchoBarra} ${by} ${bx + anchoBarra} ${by + 4} V${H - m.inf} Z" fill="var(--serie-1)"/>`;
      if (c === maxCat) {
        s += `<text x="${bx + anchoBarra / 2}" y="${by - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--tinta-2)">${moneda(c.total)}</text>`;
      }
      s += `<text x="${bx + anchoBarra / 2}" y="${H - m.inf + 18}" text-anchor="middle" font-size="11" fill="var(--tinta-suave)">${c.corto}</text>`;
    });
    s += `<line x1="${m.izq}" y1="${H - m.inf}" x2="${W - m.der}" y2="${H - m.inf}" stroke="var(--linea)" stroke-width="1"/>`;
    s += `</svg>`;
    const cont = document.getElementById("graficaCategorias");
    cont.innerHTML = s;
    cont.querySelectorAll(".barra").forEach((b) => {
      b.addEventListener("mousemove", (e) => {
        const c = categorias[Number(b.dataset.i)];
        mostrarTooltip(e, `${c.nombre}<br><strong>${moneda(c.total)}</strong>`);
        b.setAttribute("fill", "var(--acento-fuerte)");
      });
      b.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
        b.setAttribute("fill", "var(--serie-1)");
      });
    });
  })();

  function mostrarTooltip(e, html) {
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY - 10 + "px";
  }

  // ---------- Alertas de inventario ----------
  const filasInv = inventario
    .map((p) => ({ ...p, dias: Math.floor(p.stock / p.ventaDiaria) }))
    .sort((a, b) => a.dias - b.dias)
    .map((p) => {
      const urgencia =
        p.dias <= 7
          ? `<span style="color:var(--alerta);font-weight:700">⛔ ${p.dias} días</span>`
          : p.dias <= 14
          ? `<span style="color:var(--serie-4);font-weight:700">⚠️ ${p.dias} días</span>`
          : `<span style="color:var(--exito)">✓ ${p.dias} días</span>`;
      return `<tr><td>${p.producto}</td><td class="num">${p.stock}</td><td class="num">${p.ventaDiaria.toFixed(1)}/día</td><td>${urgencia}</td></tr>`;
    })
    .join("");
  document.getElementById("tablaInventario").innerHTML = `
    <table class="datos">
      <thead><tr><th>Producto</th><th style="text-align:right">Stock</th><th style="text-align:right">Ritmo</th><th>Se agota en</th></tr></thead>
      <tbody>${filasInv}</tbody>
    </table>`;

  // ---------- Próximas citas (reales, desde el servidor; solo personal) ----------
  (async function tablaCitas() {
    const cont = document.getElementById("tablaCitas");
    function claveAdmin(renovar = false) {
      if (renovar) sessionStorage.removeItem("opticasLuisa.claveAdmin");
      let clave = sessionStorage.getItem("opticasLuisa.claveAdmin");
      if (!clave) {
        clave = window.prompt("Clave de administrador para ver las citas:") || "";
        sessionStorage.setItem("opticasLuisa.claveAdmin", clave);
      }
      return clave;
    }
    try {
      let r = await fetch("/api/citas", { headers: { "x-clave-admin": claveAdmin() } });
      if (r.status === 401) {
        r = await fetch("/api/citas", { headers: { "x-clave-admin": claveAdmin(true) } });
      }
      if (r.status === 401) {
        cont.innerHTML = `<p class="sub" style="color:var(--alerta)">Sección protegida: clave incorrecta. Recarga la página para reintentar.</p>`;
        return;
      }
      const { citas } = await r.json();
      if (!citas.length) {
        cont.innerHTML = `<p class="sub">Aún no hay citas próximas registradas.</p>`;
        return;
      }
      cont.innerHTML = `
        <table class="datos">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Teléfono</th><th>Servicio</th></tr></thead>
          <tbody>${citas
            .map((c) => {
              const f = new Date(c.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                weekday: "short", day: "numeric", month: "short"
              });
              return `<tr><td>${f}</td><td class="num">${c.hora}</td><td>${c.nombre}</td><td>${c.telefono}</td><td>${c.servicio}</td></tr>`;
            })
            .join("")}</tbody>
        </table>`;
    } catch {
      cont.innerHTML = `<p class="sub">No se pudieron cargar las citas.</p>`;
    }
  })();

  // ---------- Recall de clientes ----------
  const filasRecall = clientes
    .map((c) => {
      const meses = Math.floor((hoy - c.ultimoExamen) / (1000 * 60 * 60 * 24 * 30.4));
      const mensaje = encodeURIComponent(
        `Hola ${c.nombre.split(" ")[0]} 👋, te saludamos de Ópticas Luisa. ` +
          `Tu último examen de la vista fue hace ${meses} meses y recomendamos renovarlo cada año. ` +
          `¿Te agendamos una cita esta semana? Tenemos promoción en micas antirreflejantes. 🤓`
      );
      return `<tr class="fila-alerta">
        <td>${c.nombre}</td>
        <td>${c.telefono}</td>
        <td>${c.ultimoExamen.toLocaleDateString("es-MX", { year: "numeric", month: "short" })} (hace ${meses} meses)</td>
        <td><a class="boton secundario" style="padding:4px 12px;font-size:0.82rem" target="_blank" rel="noopener"
          href="https://wa.me/52${c.telefono.replace(/\D/g, "")}?text=${mensaje}">Enviar WhatsApp</a></td>
      </tr>`;
    })
    .join("");
  document.getElementById("tablaRecall").innerHTML = `
    <table class="datos">
      <thead><tr><th>Cliente</th><th>Teléfono</th><th>Último examen</th><th>Acción</th></tr></thead>
      <tbody>${filasRecall}</tbody>
    </table>`;
})();
