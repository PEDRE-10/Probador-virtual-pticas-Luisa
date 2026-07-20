// Widget de Luisa para incrustar en cualquier sitio web (una sola línea):
//   <script src="https://luisa.opticasluisa.com/widget.js" defer></script>
// Muestra una burbuja flotante que abre el chat sin salir de la página.
(() => {
  const ORIGEN = new URL(document.currentScript.src).origin;

  const estilos = document.createElement("style");
  estilos.textContent = `
    #luisa-burbuja {
      position: fixed; right: 22px; bottom: 22px; z-index: 999998;
      width: 62px; height: 62px; border-radius: 50%; border: 0; cursor: pointer;
      background: linear-gradient(130deg, #2a78d6, #4a3aa7);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(42,120,214,0.45);
      animation: luisa-pulso 2.4s infinite; transition: transform .15s;
    }
    #luisa-burbuja:hover { transform: scale(1.08); }
    #luisa-burbuja svg { width: 34px; height: 34px; }
    @keyframes luisa-pulso {
      0%,100% { box-shadow: 0 8px 24px rgba(42,120,214,.45), 0 0 0 0 rgba(42,120,214,.35); }
      50% { box-shadow: 0 8px 24px rgba(42,120,214,.45), 0 0 0 14px rgba(42,120,214,0); }
    }
    #luisa-panel {
      position: fixed; right: 22px; bottom: 96px; z-index: 999999;
      width: 380px; max-width: calc(100vw - 32px); height: 600px; max-height: calc(100vh - 120px);
      border-radius: 18px; overflow: hidden; box-shadow: 0 18px 60px rgba(0,0,0,0.3);
      background: #fff; display: none; border: 0;
    }
    #luisa-panel.abierto { display: block; animation: luisa-sube .25s ease; }
    @keyframes luisa-sube { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
    @media (max-width: 480px) {
      #luisa-panel { right: 8px; bottom: 88px; width: calc(100vw - 16px); height: calc(100vh - 104px); }
    }
  `;
  document.head.appendChild(estilos);

  const LENTES =
    '<svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">' +
    '<circle cx="14" cy="26" r="8.5"/><circle cx="34" cy="26" r="8.5"/>' +
    '<path d="M22.5 25 Q24 22.5 25.5 25"/><path d="M5.5 25 L2.5 22.5 M42.5 25 L45.5 22.5"/>' +
    '<path d="M17 12 L19 8 M24 11 L24 6.5 M31 12 L29 8" stroke-width="2"/></svg>';
  const CERRAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" style="width:22px;height:22px">' +
    '<path d="M6 6 L18 18 M18 6 L6 18"/></svg>';

  const burbuja = document.createElement("button");
  burbuja.id = "luisa-burbuja";
  burbuja.setAttribute("aria-label", "Habla con Luisa, asistente de Ópticas Luisa");
  burbuja.innerHTML = LENTES;

  const panel = document.createElement("iframe");
  panel.id = "luisa-panel";
  panel.title = "Chat con Luisa";
  panel.loading = "lazy";

  burbuja.addEventListener("click", () => {
    if (!panel.src) panel.src = ORIGEN + "/asistente-widget.html";
    const abierto = panel.classList.toggle("abierto");
    burbuja.innerHTML = abierto ? CERRAR : LENTES;
  });

  document.body.appendChild(panel);
  document.body.appendChild(burbuja);
})();
