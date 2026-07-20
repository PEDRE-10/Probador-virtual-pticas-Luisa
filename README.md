# Ópticas Luisa — Plataforma con Inteligencia Artificial

Plataforma web para **Ópticas Luisa** que integra inteligencia artificial en la experiencia
del cliente y en la operación del negocio: probador virtual con detección facial, lector de
recetas con visión artificial, asistente conversacional, agenda de citas en línea y panel
administrativo con pronósticos.

## Módulos

| Módulo | Página | Tecnología de IA |
|---|---|---|
| **Probador virtual** | `probador.html` | Detección facial en tiempo real (MediaPipe Face Landmarker): superpone armazones sobre el rostro, clasifica la forma de la cara (ovalado, redondo, cuadrado, corazón, alargado) y estima la **distancia pupilar** usando el diámetro del iris como referencia métrica. |
| **Lector de recetas** | `receta.html` | Visión artificial de **Claude** con salida estructurada (JSON Schema): extrae esfera, cilindro, eje, adición y DP de una foto, y explica la graduación en lenguaje sencillo. |
| **Asistente virtual "Luisa"** | `asistente.html` | Chat con **Claude** (`claude-opus-4-8`): dudas sobre lentes y tratamientos, recomendaciones por forma de rostro y agendado de citas. Con caché de prompt para reducir costos. |
| **Agenda de citas** | `citas.html` | Reserva en línea con disponibilidad real por horario. La asistente "Luisa" también puede **agendar citas por sí misma desde el chat** mediante herramientas de IA (tool use): consulta horarios libres y registra la cita confirmada. |
| **Panel administrativo** | `admin.html` | Pronóstico de ventas (tendencia por mínimos cuadrados + estacionalidad semanal), predicción de agotamiento de inventario, **próximas citas en vivo** y recall automático de clientes con mensajes de WhatsApp generados. |

## Requisitos

- Node.js 18 o superior.
- Una clave de la API de Anthropic (para el asistente, el lector de recetas y las
  recomendaciones personalizadas). **Sin clave, el resto de la plataforma funciona igual**
  (probador, citas y panel usan IA local en el navegador o datos de demostración).

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
server/citas.js        Agenda: disponibilidad, validaciones y almacenamiento (server/datos/citas.json)
public/                Interfaz web (HTML/CSS/JS sin frameworks)
  js/probador.js       Detección facial, forma de rostro, distancia pupilar
  js/monturas.js       Catálogo paramétrico de armazones (se dibujan sobre el rostro)
  js/asistente.js      Chat con la asistente
  js/receta.js         Carga/compresión de foto y lectura de receta
  js/admin.js          KPIs, gráficas SVG, pronósticos y alertas
```

## Publicar en internet (www.opticasluisa.com)

El repositorio incluye `render.yaml` para desplegar en [Render](https://render.com):

1. Crea una cuenta en render.com (con tu cuenta de GitHub).
2. "New +" → "Blueprint" → conecta este repositorio; Render detecta `render.yaml` y configura todo.
3. En el panel del servicio, agrega las variables de entorno `ANTHROPIC_API_KEY` y `ADMIN_CLAVE`.
4. Al terminar tendrás una dirección tipo `https://opticas-luisa.onrender.com`.
5. Para usar el dominio propio: en Render → Settings → Custom Domains agrega
   `www.opticasluisa.com`, y en el proveedor donde compraste el dominio crea un registro
   **CNAME** de `www` apuntando al valor que Render te indique.

Nota del plan gratuito: el servidor "se duerme" tras 15 minutos sin visitas y la primera
carga siguiente tarda ~30 segundos. Para tráfico real conviene el plan de pago de Render
(~$7 USD/mes) o un VPS.

## Notas de privacidad y alcance

- El video del probador virtual se procesa **en el navegador**; no se envía a ningún servidor.
- Las fotos de recetas se envían al servidor únicamente para su lectura con la API de Claude.
- La asistente "Luisa" opera con reglas estrictas de confidencialidad: no revela nombres del
  personal, datos de otros clientes ni información interna del negocio, y no da diagnósticos.
- **Las graduaciones almacenadas no están a disposición del cliente**: los expedientes
  clínicos y la lista de citas solo se consultan con la clave de administrador
  (`ADMIN_CLAVE` en `.env`), la asistente tiene prohibido dictarlas por chat y el navegador
  del cliente no guarda copia de la receta digitalizada.
- El panel administrativo usa datos de demostración; el siguiente paso es conectarlo al punto
  de venta real.

## Hoja de ruta sugerida (siguientes fases de IA)

1. **Conexión al punto de venta**: alimentar el panel con ventas e inventario reales para que
   el pronóstico y las alertas operen sobre datos vivos.
2. ~~**Agenda inteligente**: agendado real de citas desde el chat.~~ ✅ Hecho — falta añadir
   confirmaciones automáticas por WhatsApp y sincronización con un calendario externo.
3. ~~**Historial clínico digital**: expediente por cliente con recetas digitalizadas y
   comparación automática de graduaciones entre visitas.~~ ✅ Hecho (`expedientes.html`) —
   siguiente paso: autenticación de personal para proteger los datos clínicos.
4. **Recomendador con fotos reales**: fotografiar el catálogo físico de armazones y
   renderizarlos en el probador (hoy son modelos vectoriales).
5. **Campañas automáticas**: segmentación de clientes con IA (frecuencia, ticket, tipo de
   producto) y generación de campañas personalizadas.

---

Repositorio para el desarrollo virtual y herramientas tecnológicas de Ópticas Luisa.
