// Probador virtual: detección facial con MediaPipe FaceLandmarker,
// superposición de armazones, clasificación de forma de rostro y
// estimación de distancia pupilar mediante los landmarks del iris.
import { MONTURAS, dibujarMontura } from "./monturas.js";

// MediaPipe se carga bajo demanda al encender la cámara, para que la página
// funcione aunque el CDN no esté disponible en ese momento.
const CDN_MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById("video");
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const estado = document.getElementById("estado");
const btnCamara = document.getElementById("btnCamara");
const btnRecomendar = document.getElementById("btnRecomendar");

const DIAMETRO_IRIS_MM = 11.7; // diámetro corneal promedio en adultos

let landmarker = null;
let monturaActual = MONTURAS[0];
let corriendo = false;
let formaDetectada = null;
let dpDetectada = null;
// Suavizado de medidas entre cuadros para evitar parpadeo
const historial = { dp: [], forma: [] };

construirSelector();

btnCamara.addEventListener("click", async () => {
  btnCamara.disabled = true;
  try {
    estado.textContent = "Cargando el modelo de detección facial…";
    await cargarModelo();
    estado.textContent = "Solicitando acceso a la cámara…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" }
    });
    video.srcObject = stream;
    await video.play();
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    corriendo = true;
    btnCamara.classList.add("oculto");
    estado.textContent = "Muévete con naturalidad; elige un armazón abajo. 👇";
    requestAnimationFrame(procesarCuadro);
  } catch (err) {
    console.error(err);
    estado.textContent =
      "No se pudo iniciar la cámara o el modelo. Revisa los permisos del navegador y tu conexión.";
    btnCamara.disabled = false;
  }
});

async function cargarModelo() {
  const { FaceLandmarker, FilesetResolver } = await import(CDN_MEDIAPIPE);
  const fileset = await FilesetResolver.forVisionTasks(`${CDN_MEDIAPIPE}/wasm`);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 1
  });
}

let ultimoTiempo = -1;
function procesarCuadro() {
  if (!corriendo) return;
  if (video.currentTime !== ultimoTiempo) {
    ultimoTiempo = video.currentTime;
    const resultado = landmarker.detectForVideo(video, performance.now());
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    const cara = resultado.faceLandmarks?.[0];
    if (cara) {
      const geom = geometriaOjos(cara);
      dibujarMontura(ctx, monturaActual, geom);
      actualizarAnalisis(cara, geom);
    }
  }
  requestAnimationFrame(procesarCuadro);
}

function px(lm) {
  return { x: lm.x * lienzo.width, y: lm.y * lienzo.height };
}
function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Centros de iris: derecho 468, izquierdo 473 (el modelo incluye iris).
function geometriaOjos(cara) {
  const irisDer = px(cara[468]);
  const irisIzq = px(cara[473]);
  const dist = distancia(irisDer, irisIzq);
  return {
    cx: (irisDer.x + irisIzq.x) / 2,
    cy: (irisDer.y + irisIzq.y) / 2,
    dist,
    angulo: Math.atan2(irisIzq.y - irisDer.y, irisIzq.x - irisDer.x)
  };
}

function actualizarAnalisis(cara, geom) {
  // --- Distancia pupilar: se calibra con el diámetro real del iris ---
  const diamIrisDerPx = distancia(px(cara[469]), px(cara[471]));
  const diamIrisIzqPx = distancia(px(cara[474]), px(cara[476]));
  const mmPorPx = DIAMETRO_IRIS_MM / ((diamIrisDerPx + diamIrisIzqPx) / 2);
  const dpMm = geom.dist * mmPorPx;
  historial.dp.push(dpMm);
  if (historial.dp.length > 45) historial.dp.shift();

  // --- Forma del rostro por proporciones entre landmarks ---
  const anchoPomulos = distancia(px(cara[234]), px(cara[454]));
  const anchoMandibula = distancia(px(cara[172]), px(cara[397]));
  const anchoFrente = distancia(px(cara[54]), px(cara[284]));
  const altoCara = distancia(px(cara[10]), px(cara[152]));
  const forma = clasificarForma(anchoPomulos, anchoMandibula, anchoFrente, altoCara);
  historial.forma.push(forma);
  if (historial.forma.length > 45) historial.forma.shift();

  // Actualizar la interfaz ~2 veces por segundo con valores estabilizados
  if (historial.dp.length % 15 === 0) {
    const dpProm = historial.dp.reduce((s, v) => s + v, 0) / historial.dp.length;
    dpDetectada = Math.round(dpProm);
    const conteo = {};
    for (const f of historial.forma) conteo[f] = (conteo[f] || 0) + 1;
    formaDetectada = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];

    document.getElementById("dp").textContent = `≈ ${dpDetectada} mm`;
    document.getElementById("formaRostro").textContent =
      formaDetectada[0].toUpperCase() + formaDetectada.slice(1);
    const ideales = MONTURAS.filter((m) => m.formasIdeales.includes(formaDetectada));
    document.getElementById("recomendadas").textContent = ideales
      .map((m) => m.nombre)
      .join(", ");
    btnRecomendar.disabled = false;
    marcarIdeales(formaDetectada);
  }
}

function clasificarForma(pomulos, mandibula, frente, alto) {
  const razonAlto = alto / pomulos;
  if (razonAlto > 1.5) return "alargado";
  if (frente > pomulos * 0.98 && mandibula < pomulos * 0.82) return "corazón";
  if (mandibula > pomulos * 0.92 && razonAlto < 1.32) return "cuadrado";
  if (razonAlto < 1.25) return "redondo";
  return "ovalado";
}

function construirSelector() {
  const cont = document.getElementById("selectorMonturas");
  for (const m of MONTURAS) {
    const b = document.createElement("button");
    b.dataset.id = m.id;
    b.innerHTML = `<strong>${m.nombre}</strong><span class="precio">$${m.precio} MXN</span><span class="ideal oculto">✓ Ideal para ti</span>`;
    if (m.id === monturaActual.id) b.classList.add("activo");
    b.addEventListener("click", () => {
      monturaActual = m;
      cont.querySelectorAll("button").forEach((x) => x.classList.remove("activo"));
      b.classList.add("activo");
    });
    cont.appendChild(b);
  }
}

function marcarIdeales(forma) {
  document.querySelectorAll("#selectorMonturas button").forEach((b) => {
    const m = MONTURAS.find((x) => x.id === b.dataset.id);
    b.querySelector(".ideal").classList.toggle("oculto", !m.formasIdeales.includes(forma));
  });
}

btnRecomendar.addEventListener("click", async () => {
  if (!formaDetectada) return;
  const salida = document.getElementById("recomendacionIA");
  btnRecomendar.disabled = true;
  salida.textContent = "Consultando a la IA…";
  try {
    const r = await fetch("/api/recomendacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formaRostro: formaDetectada,
        distanciaPupilarMm: dpDetectada,
        estiloVida: document.getElementById("estiloVida").value.trim()
      })
    });
    const datos = await r.json();
    if (datos.offline) {
      salida.textContent =
        "La recomendación con IA requiere configurar la clave de la API en el servidor. " +
        "Con base en tu rostro, te sugerimos: " +
        MONTURAS.filter((m) => m.formasIdeales.includes(formaDetectada))
          .map((m) => m.nombre)
          .join(", ") + ".";
    } else {
      salida.textContent = datos.recomendacion || datos.error || "Sin respuesta.";
    }
  } catch {
    salida.textContent = "No se pudo contactar al servidor.";
  } finally {
    btnRecomendar.disabled = false;
  }
});
