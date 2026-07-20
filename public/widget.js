// Widget de Luisa para incrustar en cualquier sitio web (una sola línea):
//   <script src="https://luisa.opticasluisa.com/widget.js" defer></script>
// Muestra la burbuja con el logo de Ópticas Luisa que abre el chat sin salir
// de la página anfitriona.
(() => {
  const ORIGEN = new URL(document.currentScript.src).origin;

  const estilos = document.createElement("style");
  estilos.textContent = `
    #luisa-burbuja {
      position: fixed; right: 22px; bottom: 22px; z-index: 999998;
      width: 64px; height: 64px; border-radius: 50%; cursor: pointer;
      background: #ffffff; border: 2px solid rgba(91,196,180,0.5);
      display: flex; align-items: center; justify-content: center; padding: 0;
      box-shadow: 0 8px 24px rgba(47,148,136,0.45);
      animation: luisa-pulso 2.4s infinite; transition: transform .15s;
    }
    #luisa-burbuja:hover { transform: scale(1.08); }
    #luisa-burbuja img { width: 74%; height: auto; }
    #luisa-burbuja.abierto { background: linear-gradient(130deg, #2f9488, #0f6e62); border-color: transparent; }
    #luisa-burbuja svg { width: 22px; height: 22px; }
    @keyframes luisa-pulso {
      0%,100% { box-shadow: 0 8px 24px rgba(47,148,136,.45), 0 0 0 0 rgba(91,196,180,.4); }
      50% { box-shadow: 0 8px 24px rgba(47,148,136,.45), 0 0 0 14px rgba(91,196,180,0); }
    }
    #luisa-panel {
      position: fixed; right: 22px; bottom: 98px; z-index: 999999;
      width: 380px; max-width: calc(100vw - 32px); height: 600px; max-height: calc(100vh - 122px);
      border-radius: 18px; overflow: hidden; box-shadow: 0 18px 60px rgba(0,0,0,0.3);
      background: #fff; display: none; border: 0;
    }
    #luisa-panel.abierto { display: block; animation: luisa-sube .25s ease; }
    @keyframes luisa-sube { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
    @media (max-width: 480px) {
      #luisa-panel { right: 8px; bottom: 90px; width: calc(100vw - 16px); height: calc(100vh - 106px); }
    }
  `;
  document.head.appendChild(estilos);

  const LOGO = `<img src="${ORIGEN}/img/logo.png" alt="Luisa — Ópticas Luisa" />`;
  const CERRAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">' +
    '<path d="M6 6 L18 18 M18 6 L6 18"/></svg>';

  const burbuja = document.createElement("button");
  burbuja.id = "luisa-burbuja";
  burbuja.setAttribute("aria-label", "Habla con Luisa, asistente de Ópticas Luisa");
  burbuja.innerHTML = LOGO;

  const panel = document.createElement("iframe");
  panel.id = "luisa-panel";
  panel.title = "Chat con Luisa";
  panel.loading = "lazy";

  burbuja.addEventListener("click", () => {
    if (!panel.src) panel.src = ORIGEN + "/asistente-widget.html";
    const abierto = panel.classList.toggle("abierto");
    burbuja.classList.toggle("abierto", abierto);
    burbuja.innerHTML = abierto ? CERRAR : LOGO;
  });

  document.body.appendChild(panel);
  document.body.appendChild(burbuja);
})();
