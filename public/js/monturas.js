// Catálogo de armazones del probador virtual.
// Cada montura se dibuja de forma paramétrica sobre el rostro detectado:
// las medidas están normalizadas a la distancia entre los ojos (= 1.0).
const MONTURAS = [
  {
    id: "clasico-redondo",
    nombre: "Clásico Redondo",
    precio: 1290,
    color: "#8a5a2b",
    grosor: 0.045,
    lente: { ancho: 0.92, alto: 0.82, radio: 0.45 },
    formasIdeales: ["cuadrado", "corazón", "alargado"]
  },
  {
    id: "urbano-rectangular",
    nombre: "Urbano Rectangular",
    precio: 1490,
    color: "#1f1f1f",
    grosor: 0.05,
    lente: { ancho: 1.0, alto: 0.66, radio: 0.12 },
    formasIdeales: ["redondo", "ovalado"]
  },
  {
    id: "aviador",
    nombre: "Aviador Dorado",
    precio: 1690,
    color: "#c9a227",
    grosor: 0.03,
    lente: { ancho: 1.0, alto: 0.88, radio: 0.32, caida: 0.12 },
    formasIdeales: ["cuadrado", "ovalado", "corazón"]
  },
  {
    id: "cat-eye",
    nombre: "Cat-Eye Rubí",
    precio: 1590,
    color: "#7a1f3d",
    grosor: 0.05,
    lente: { ancho: 0.98, alto: 0.7, radio: 0.2, alzado: 0.14 },
    formasIdeales: ["redondo", "cuadrado", "alargado"]
  },
  {
    id: "wayfarer",
    nombre: "Wayfarer Negro",
    precio: 1390,
    color: "#141414",
    grosor: 0.065,
    lente: { ancho: 1.02, alto: 0.78, radio: 0.24 },
    formasIdeales: ["ovalado", "redondo", "alargado"]
  },
  {
    id: "minimal",
    nombre: "Minimal Titanio",
    precio: 1990,
    color: "#8d99a6",
    grosor: 0.02,
    lente: { ancho: 0.95, alto: 0.72, radio: 0.3 },
    formasIdeales: ["ovalado", "corazón", "redondo", "cuadrado", "alargado"]
  }
];

// Dibuja la montura sobre el lienzo. geom: {cx, cy, dist, angulo}
// donde dist es la distancia entre centros de ojos en píxeles.
function dibujarMontura(ctx, montura, geom) {
  const { cx, cy, dist, angulo } = geom;
  const l = montura.lente;
  const w = (l.ancho * dist) / 2; // semiancho de cada lente
  const h = (l.alto * dist) / 2;
  const grosor = Math.max(2, montura.grosor * dist);
  const sepOjos = dist / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angulo);
  ctx.lineWidth = grosor;
  ctx.strokeStyle = montura.color;
  ctx.lineJoin = "round";
  ctx.fillStyle = "rgba(120, 160, 220, 0.14)"; // reflejo suave de la mica

  for (const lado of [-1, 1]) {
    const ex = lado * sepOjos;
    ctx.beginPath();
    trazarLente(ctx, ex, 0, w, h, l, lado);
    ctx.fill();
    ctx.stroke();
  }

  // Puente
  ctx.beginPath();
  ctx.moveTo(-sepOjos + w * 0.92, -h * 0.25);
  ctx.quadraticCurveTo(0, -h * 0.55, sepOjos - w * 0.92, -h * 0.25);
  ctx.stroke();

  // Varillas hacia las sienes
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(lado * (sepOjos + w * 0.95), -h * 0.35);
    ctx.lineTo(lado * (sepOjos + w * 1.55), -h * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

function trazarLente(ctx, ex, ey, w, h, l, lado) {
  const r = Math.min(w, h) * (l.radio ?? 0.2) * 2;
  const alzado = (l.alzado ?? 0) * h * 2 * -1; // cat-eye: esquina exterior elevada
  const caida = (l.caida ?? 0) * h * 2; // aviador: borde inferior más amplio
  const x0 = ex - w, x1 = ex + w;
  const yTopIn = ey - h, yTopOut = ey - h + (lado === 1 ? 0 : 0) + alzado * (lado === 1 ? 1 : 1);
  const yBot = ey + h + caida;
  // Rectángulo redondeado con ajustes de estilo
  ctx.moveTo(x0 + r, yTopIn);
  ctx.lineTo(x1 - r, ey - h + (lado === 1 ? alzado : 0) * 0 + (lado === 1 ? 0 : 0));
  ctx.quadraticCurveTo(x1, ey - h + (lado === 1 ? alzado : alzado), x1, ey - h + r);
  ctx.lineTo(x1, yBot - r);
  ctx.quadraticCurveTo(x1, yBot, x1 - r, yBot);
  ctx.lineTo(x0 + r, yBot);
  ctx.quadraticCurveTo(x0, yBot, x0, yBot - r);
  ctx.lineTo(x0, ey - h + r);
  ctx.quadraticCurveTo(x0, yTopIn + alzado, x0 + r, yTopIn);
  ctx.closePath();
}

export { MONTURAS, dibujarMontura };
