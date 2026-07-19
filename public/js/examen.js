// Pre-examen visual orientativo: calibración, agudeza (E de Snellen),
// astigmatismo, percepción de color (láminas generadas por código) y
// sensibilidad al contraste.
(() => {
  const ANCHO_TARJETA_MM = 85.6; // tarjeta bancaria estándar ISO/IEC 7810
  const DISTANCIA_MM = 600; // ~un brazo de distancia
  const resultados = {};
  let pxPorMm = 320 / ANCHO_TARJETA_MM;

  // ---------- navegación entre pasos ----------
  const TOTAL_PASOS = 6;
  let paso = 0;
  const progreso = document.getElementById("progreso");
  for (let i = 0; i < TOTAL_PASOS; i++) progreso.appendChild(document.createElement("span"));

  function irAPaso(n) {
    paso = n;
    document.querySelectorAll(".paso").forEach((s, i) => s.classList.toggle("activo", i === n));
    [...progreso.children].forEach((b, i) => b.classList.toggle("hecho", i <= n));
    if (n === 1) iniciarAgudeza();
    if (n === 2) dibujarAbanico();
    if (n === 3) iniciarColor();
    if (n === 4) iniciarContraste();
    if (n === 5) generarReporte();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  irAPaso(0);

  // ---------- paso 0: calibración ----------
  const calibre = document.getElementById("calibre");
  const tarjeta = document.getElementById("tarjetaCalibre");
  function aplicarCalibre() {
    tarjeta.style.width = calibre.value + "px";
    pxPorMm = Number(calibre.value) / ANCHO_TARJETA_MM;
  }
  calibre.addEventListener("input", aplicarCalibre);
  aplicarCalibre();
  document.querySelector("[data-siguiente]").addEventListener("click", () => irAPaso(1));

  // ---------- paso 1: agudeza visual (E direccional) ----------
  const NIVELES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0, 1.2];
  const DIRS = ["arriba", "abajo", "izquierda", "derecha"];
  let nivelIdx = 0;
  let dirActual = "derecha";
  let mejorNivel = null;

  function tamanoEPx(nivel) {
    // Una E de agudeza 1.0 subtiende 5 minutos de arco a la distancia dada.
    const alturaMm = (DISTANCIA_MM * 0.0014544) / nivel;
    return alturaMm * pxPorMm;
  }

  function iniciarAgudeza() {
    nivelIdx = 0;
    mejorNivel = null;
    mostrarE();
  }

  function mostrarE() {
    const c = document.getElementById("lienzoE");
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    dirActual = DIRS[Math.floor(Math.random() * 4)];
    const t = Math.max(6, tamanoEPx(NIVELES[nivelIdx]));
    const u = t / 5;
    g.save();
    g.translate(c.width / 2, c.height / 2);
    const rot = { derecha: 0, abajo: Math.PI / 2, izquierda: Math.PI, arriba: -Math.PI / 2 }[dirActual];
    g.rotate(rot);
    g.fillStyle = "#000";
    // E de Snellen sobre una retícula de 5×5 unidades (patitas hacia la derecha)
    g.fillRect(-t / 2, -t / 2, u, t); // barra vertical
    g.fillRect(-t / 2, -t / 2, t, u); // superior
    g.fillRect(-t / 2, -u / 2, t, u); // media
    g.fillRect(-t / 2, t / 2 - u, t, u); // inferior
    g.restore();
    document.getElementById("infoAgudeza").textContent =
      `Nivel ${nivelIdx + 1} de ${NIVELES.length}`;
  }

  document.querySelectorAll(".flechas button").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.dir === dirActual) {
        mejorNivel = NIVELES[nivelIdx];
        if (nivelIdx < NIVELES.length - 1) {
          nivelIdx++;
          mostrarE();
        } else {
          terminarAgudeza();
        }
      } else {
        terminarAgudeza();
      }
    })
  );

  function terminarAgudeza() {
    resultados.agudeza = mejorNivel;
    irAPaso(2);
  }

  // ---------- paso 2: astigmatismo ----------
  function dibujarAbanico() {
    const svg = document.getElementById("abanico");
    if (svg.childElementCount) return;
    for (let ang = 0; ang < 180; ang += 15) {
      const rad = (ang * Math.PI) / 180;
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", Math.cos(rad) * 118);
      l.setAttribute("y1", Math.sin(rad) * 118);
      l.setAttribute("x2", -Math.cos(rad) * 118);
      l.setAttribute("y2", -Math.sin(rad) * 118);
      l.setAttribute("stroke", "currentColor");
      l.setAttribute("stroke-width", "3");
      svg.appendChild(l);
    }
  }
  document.querySelectorAll("[data-astig]").forEach((b) =>
    b.addEventListener("click", () => {
      resultados.astigmatismo = b.dataset.astig === "si";
      irAPaso(3);
    })
  );

  // ---------- paso 3: percepción de color ----------
  const PLACAS = [
    { digito: "5", figura: ["#c0392b", "#e74c3c", "#d35400"], fondo: ["#7f9c48", "#93a85a", "#a8b56b"] },
    { digito: "8", figura: ["#27ae60", "#2e9e5b", "#52b788"], fondo: ["#c96a4a", "#b5651d", "#cd7f5a"] },
    { digito: "3", figura: ["#d68910", "#e67e22", "#ca6f1e"], fondo: ["#839192", "#95a5a6", "#a6acaf"] }
  ];
  let placaIdx = 0;
  let aciertosColor = 0;

  function iniciarColor() {
    placaIdx = 0;
    aciertosColor = 0;
    dibujarPlaca();
  }

  function dibujarPlaca() {
    const { digito, figura, fondo } = PLACAS[placaIdx];
    const c = document.getElementById("placaColor");
    const g = c.getContext("2d");
    const R = c.width / 2;
    // Máscara del dígito en un lienzo fuera de pantalla
    const m = document.createElement("canvas");
    m.width = c.width; m.height = c.height;
    const mg = m.getContext("2d");
    mg.font = `bold ${c.width * 0.72}px system-ui, sans-serif`;
    mg.textAlign = "center";
    mg.textBaseline = "middle";
    mg.fillStyle = "#000";
    mg.fillText(digito, R, R + c.width * 0.04);
    const mascara = mg.getImageData(0, 0, m.width, m.height).data;

    g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < 1400; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * (R - 8);
      const x = R + Math.cos(ang) * rad;
      const y = R + Math.sin(ang) * rad;
      const enFigura = mascara[(Math.round(y) * m.width + Math.round(x)) * 4 + 3] > 100;
      const paleta = enFigura ? figura : fondo;
      g.fillStyle = paleta[Math.floor(Math.random() * paleta.length)];
      g.beginPath();
      g.arc(x, y, 2.4 + Math.random() * 3.4, 0, Math.PI * 2);
      g.fill();
    }
    document.getElementById("infoColor").textContent = `Lámina ${placaIdx + 1} de ${PLACAS.length}`;
    document.getElementById("respColor").value = "";
  }

  document.getElementById("btnColor").addEventListener("click", () => {
    if (document.getElementById("respColor").value.trim() === PLACAS[placaIdx].digito) {
      aciertosColor++;
    }
    placaIdx++;
    if (placaIdx < PLACAS.length) {
      dibujarPlaca();
    } else {
      resultados.color = { aciertos: aciertosColor, total: PLACAS.length };
      irAPaso(4);
    }
  });

  // ---------- paso 4: sensibilidad al contraste ----------
  const CONTRASTES = [1, 0.5, 0.25, 0.12, 0.06, 0.03, 0.015];
  const LETRAS = "CDEFHKNPRUVZ";
  let contrasteIdx = 0;
  let letraActual = "";
  let mejorContraste = null;

  function iniciarContraste() {
    contrasteIdx = 0;
    mejorContraste = null;
    mostrarContraste();
  }

  function mostrarContraste() {
    const c = document.getElementById("lienzoContraste");
    const g = c.getContext("2d");
    letraActual = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    const gris = Math.round(255 * (1 - CONTRASTES[contrasteIdx]));
    g.fillStyle = `rgb(${gris},${gris},${gris})`;
    g.font = "bold 90px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letraActual, c.width / 2, c.height / 2 + 6);
    document.getElementById("respContraste").value = "";
  }

  document.getElementById("btnContraste").addEventListener("click", () => {
    const resp = document.getElementById("respContraste").value.trim().toUpperCase();
    if (resp === letraActual) {
      mejorContraste = CONTRASTES[contrasteIdx];
      if (contrasteIdx < CONTRASTES.length - 1) {
        contrasteIdx++;
        mostrarContraste();
        return;
      }
    }
    terminarContraste();
  });
  document.getElementById("btnNoVeo").addEventListener("click", terminarContraste);

  function terminarContraste() {
    resultados.contraste = mejorContraste;
    irAPaso(5);
  }

  // ---------- paso 5: reporte ----------
  function generarReporte() {
    const a = resultados.agudeza;
    const filas = [];
    filas.push([
      "Agudeza visual (ambos ojos, con corrección si la usas)",
      a ? `≈ ${a.toFixed(1)} decimal (${equivalenteSnellen(a)})` : "No completada",
      !a || a < 0.5
        ? "Sugerimos examen de graduación."
        : a < 0.8
        ? "Ligeramente por debajo de lo esperado; vale la pena revisarla."
        : "Dentro del rango esperado."
    ]);
    filas.push([
      "Astigmatismo (abanico)",
      resultados.astigmatismo ? "Líneas desiguales" : "Líneas uniformes",
      resultados.astigmatismo
        ? "Puede indicar astigmatismo; conviene una refracción completa."
        : "Sin indicios en esta prueba."
    ]);
    const col = resultados.color || { aciertos: 0, total: 3 };
    filas.push([
      "Percepción de color",
      `${col.aciertos} de ${col.total} láminas`,
      col.aciertos === col.total
        ? "Sin indicios de alteración rojo-verde."
        : "Algunas láminas no coincidieron; se recomienda prueba de Ishihara formal."
    ]);
    filas.push([
      "Sensibilidad al contraste",
      resultados.contraste ? `Hasta ${(resultados.contraste * 100).toFixed(1)} % de contraste` : "No completada",
      resultados.contraste && resultados.contraste <= 0.06
        ? "Buena sensibilidad al contraste."
        : "Menor de lo esperado; coméntalo en tu examen."
    ]);

    document.getElementById("reporte").innerHTML = `
      <table class="datos">
        <thead><tr><th>Prueba</th><th>Resultado</th><th>Comentario orientativo</th></tr></thead>
        <tbody>${filas
          .map((f) => `<tr><td>${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td></tr>`)
          .join("")}</tbody>
      </table>
      <p class="sub" style="margin-top:12px">Fecha: ${new Date().toLocaleDateString("es-MX", {
        year: "numeric", month: "long", day: "numeric"
      })} · Distancia de prueba: 60 cm · Calibrado con tarjeta bancaria.</p>`;
  }

  function equivalenteSnellen(decimal) {
    const den = Math.round(20 / decimal);
    return `20/${den}`;
  }
})();
