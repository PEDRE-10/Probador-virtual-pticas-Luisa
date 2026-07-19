# Ópticas Luisa — Plataforma con Inteligencia Artificial

Plataforma web para **Ópticas Luisa** que integra inteligencia artificial en la experiencia
del cliente y en la operación del negocio: probador virtual con detección facial, pre-examen
visual en línea, lector de recetas con visión artificial, asistente conversacional y panel
administrativo con pronósticos.

## Módulos

| Módulo | Página | Tecnología de IA |
|---|---|---|
| **Probador virtual** | `probador.html` | Detección facial en tiempo real (MediaPipe Face Landmarker): superpone armazones sobre el rostro, clasifica la forma de la cara (ovalado, redondo, cuadrado, corazón, alargado) y estima la **distancia pupilar** usando el diámetro del iris como referencia métrica. |
| **Pre-examen visual** | `examen.html` | Pruebas orientativas con calibración de pantalla (tarjeta bancaria): agudeza visual con E de Snellen, abanico de astigmatismo, láminas de color generadas por código y sensibilidad al contraste. Genera un reporte imprimible. |
| **Lector de recetas** | `receta.html` | Visión artificial de **Claude** con salida estructurada (JSON Schema): extrae esfera, cilindro, eje, adición y DP de una foto, y explica la graduación en lenguaje sencillo. |
| **Asistente virtual "Luisa"** | `asistente.html` | Chat con **Claude** (`claude-opus-4-8`): dudas sobre lentes y tratamientos, recomendaciones por forma de rostro y agendado de citas. Con caché de prompt para reducir costos. |
| **Panel administrativo** | `admin.html` | Pronóstico de ventas (tendencia por mínimos cuadrados + estacionalidad semanal), predicción de agotamiento de inventario y recall automático de clientes con mensajes de WhatsApp generados. |

## Requisitos

- Node.js 18 o superior.
- Una clave de la API de Anthropic (para el asistente, el lector de recetas y las
  recomendaciones personalizadas). **Sin clave, el resto de la plataforma funciona igual**
  (probador, pre-examen y panel usan IA local en el navegador o datos de demostración).

## Instalación y arranque

```bash
npm install
cp .env.example .env   # coloca tu ANTHROPIC_API_KEY
npm start              # abre http://localhost:3000
```

Para desarrollo con recarga automática: `npm run dev`.

## Estructura

```
server/index.js        Servidor Express + endpoints de IA (/api/chat, /api/receta, /api/recomendacion)
public/                Interfaz web (HTML/CSS/JS sin frameworks)
  js/probador.js       Detección facial, forma de rostro, distancia pupilar
  js/monturas.js       Catálogo paramétrico de armazones (se dibujan sobre el rostro)
  js/examen.js         Pre-examen visual de 5 pruebas
  js/asistente.js      Chat con la asistente
  js/receta.js         Carga/compresión de foto y lectura de receta
  js/admin.js          KPIs, gráficas SVG, pronósticos y alertas
```

## Notas de privacidad y alcance

- El video del probador virtual se procesa **en el navegador**; no se envía a ningún servidor.
- Las fotos de recetas se envían al servidor únicamente para su lectura con la API de Claude.
- El pre-examen visual es **orientativo** y no sustituye un examen profesional; la interfaz lo
  indica en todo momento.
- El panel administrativo usa datos de demostración; el siguiente paso es conectarlo al punto
  de venta real.

## Hoja de ruta sugerida (siguientes fases de IA)

1. **Conexión al punto de venta**: alimentar el panel con ventas e inventario reales para que
   el pronóstico y las alertas operen sobre datos vivos.
2. **Agenda inteligente**: agendado real de citas desde el chat (calendario + confirmaciones
   automáticas por WhatsApp).
3. **Historial clínico digital**: expediente por cliente con recetas digitalizadas y
   comparación automática de graduaciones entre visitas.
4. **Recomendador con fotos reales**: fotografiar el catálogo físico de armazones y
   renderizarlos en el probador (hoy son modelos vectoriales).
5. **Campañas automáticas**: segmentación de clientes con IA (frecuencia, ticket, tipo de
   producto) y generación de campañas personalizadas.

---

Repositorio para el desarrollo virtual y herramientas tecnológicas de Ópticas Luisa.
