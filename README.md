# Atlas · Anatomía en perspectiva

Atlas anatómico interactivo en español, construido con React, TypeScript,
Three.js y Vite. Todo el contenido se sirve desde la propia aplicación: no
necesita una cuenta, claves, base de datos ni peticiones a un servicio externo.

## Desarrollo

Node **24.22.1** (ver `.node-version`) y npm. En este entorno, usa el checkout
existente en `/workspace/atlas`; cada tarea ya está aislada y no requiere otro
worktree.

```bash
cd /workspace/atlas
npm ci
npm run dev -- --port 5173 --strictPort
```

El servidor escucha en todas las interfaces para desarrollo. Los modelos,
tipografías y datos están incluidos en el repositorio; no hace falta Blender
para instalar, desarrollar o publicar la aplicación.

```bash
npm test           # Recuento, nomenclatura, búsqueda y cobertura real de mallas
npm run build     # TypeScript y producción en dist/
npm run test:e2e  # Chromium: selección, modelos, diccionario, repaso y móvil
npm run preview -- --port 4173 --strictPort
```

Las pruebas de navegador usan `/usr/bin/chromium` cuando está instalado, o
`CHROMIUM_PATH` si se proporciona. En otros equipos se puede instalar el
Chromium de Playwright con `npx playwright install chromium`.

## Contenido y navegación

- **206 huesos adultos individuales**: 80 axiales y 126 apendiculares, con
  identificación de cada lado, nombre español y latino, descripción,
  principales accidentes óseos y articulaciones.
- Otros cuatro modelos seleccionables: sistema muscular, cardiovascular,
  nervioso y visceral. Las superficies provienen de Z-Anatomy/BodyParts3D;
  no son un esqueleto generado con primitivas geométricas.
- Diccionario con las **7.298 entradas no vacías** de la tabla TA2 de la fuente:
  español, latín e inglés. Incluye sus identificadores extendidos y una
  entrada que el original no numera. No se afirma que esta tabla contenga
  todos los sinónimos, variantes y términos posibles de anatomía humana.
- Giro, desplazamiento, zoom, vistas anterior/posterior/lateral, selección
  por raycasting, etiquetas, enfoque, aislamiento, transparencia y ocultación.
- Búsqueda entre sistemas y enlace directo a una estructura mediante
  `#hueso=ID`. Marcadores, tarjetas de repaso de los 206 huesos y progreso
  persistente en `localStorage`. Descarga del progreso en JSON.
- Interfaz adaptable, teclado, diálogos accesibles y consulta de nombres
  incluso cuando WebGL no está disponible.

El recuento de 206 es convencional para el adulto: sacro, cóccix y esternón
cuentan como un hueso cada uno; dientes y sesamoideos variables no cuentan.
Se incluyen las rótulas y los seis huesecillos del oído. Los 28 dientes del
modelo son referencias visuales no seleccionables, no huesos adicionales.
Las variaciones individuales y los modelos ausentes de la fuente no se
inventan. Los nombres adicionales sin término latino se identifican como tal.

## Modelos y licencias

Lee [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). El código original es
MIT; el contenido anatómico conserva sus licencias y atribuciones, incluidas
las restricciones no comerciales de determinados componentes del modelo
original. Las definiciones originales están en inglés y enlazan sus artículos
de Wikipedia. No es un producto clínicamente validado.

Los modelos se cargan bajo demanda por sistema. Se conservan en Git como
GLB comprimidos con Meshopt; el descodificador se incluye en el bundle.

## Regenerar los datos y las mallas (opcional)

El flujo de desarrollo normal utiliza los assets ya incluidos. Para reproducir
la conversión, se necesita Blender 4.3.2, Python 3 y acceso HTTPS a
`raw.githubusercontent.com`; la fuente fijada y sus checksums se documentan en
los avisos de terceros. Ver `scripts/rebuild-assets.sh`.

La regeneración conserva el orden: catálogo → exportaciones → nombres →
definiciones → compresión. No altera el archivo Blender original.

## Publicación de la web

`dist/` es una web estática y puede desplegarse en cualquier alojamiento
estático con WebGL y archivos GLB. Este proyecto no publica un sitio ni
contrata alojamiento automáticamente. El router no requiere reescrituras:
los enlaces a estructuras utilizan el fragmento de la URL.
