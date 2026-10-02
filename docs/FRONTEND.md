# El front de Voitos

Última actualización: **2 de octubre de 2026** · rama `ojman/frontend`

Este documento cuenta cómo está armada la aplicación y, sobre todo, **por qué**
está armada así. La app la usa quien cuida a otro: muchas veces un hijo de más
de cincuenta, a veces un enfermero en un pasillo, casi siempre apurado. Ese es
el criterio con el que se toma cada decisión de acá.

---

## 1. Dónde está cada cosa

```
app/
├── app.json              configuración de Expo (tema fijo en oscuro)
├── vercel.json           cómo compila y se sirve la versión web
├── scripts/contraste.js  verificación de contraste WCAG (npm run contraste)
├── public/landing/       la landing del equipo, copiada tal cual (sección 6)
└── src/
    ├── app/        las pantallas. expo-router arma las rutas leyendo esta carpeta
    ├── ui/         el kit de piezas compartidas (Boton, Campo, Tarjeta, ...)
    ├── components/ piezas con lógica propia (BotonGoogle, FilaDosis, ...)
    ├── lib/        cliente de la API y funciones de dominio, sin nada visual
    └── tema/       colores, tipografía, espaciado
```

La división entre `ui/` y `components/` no es cosmética: `ui/` no sabe nada del
dominio —un `Boton` no sabe qué es una dosis—, así que se puede usar en
cualquier pantalla sin arrastrar reglas de negocio.

---

## 2. El tema: uno solo, y a propósito

**La aplicación tiene una sola paleta: el verde de la marca sobre verde muy
oscuro. No hay modo claro ni interruptor de tema.**

Durante un tiempo sí los hubo. Se sacaron el 15 de septiembre y conviene dejar
escrito el motivo, porque es la clase de decisión que alguien va a querer
revertir sin acordarse de lo que costaba:

- **Dos paletas son dos veces todo.** Cada pantalla nueva había que mirarla en
  los dos modos, y cada color nuevo había que medirlo dos veces contra WCAG. Se
  paga en pantallas a medio revisar, que es justo lo que una app de medicación
  no puede tener.
- **El tema era un estado más, y los estados se rompen.** Era el único dato de
  la aplicación que vivía en `localStorage`, se leía antes de la primera
  pintada con un script en el `<head>` y tenía que sobrevivir a la hidratación
  del prerender. Ya nos había dado un bug de tema a medio aplicar, y otro de
  preferencia guardada que al recargar volvía al valor del servidor.
- **Quien necesita la pantalla más clara tiene el brillo del teléfono**, que es
  un control que ya sabe usar y que funciona en todas las aplicaciones, no solo
  en esta.

Lo que sí se conservó es la **forma de pedir los colores**. Ninguna pantalla
escribe un color a mano:

```ts
const colores = useColores();          // la paleta entera

const useEstilos = crearEstilos((colores) => ({
  caja: { backgroundColor: colores.superficie },
}));
```

`crearEstilos` arma la hoja una sola vez y la guarda. Antes rehacía la hoja en
cada cambio de tema; ahora es una constante, pero se mantuvo la firma porque la
usan más de treinta archivos y porque obliga a pasar por la paleta.

### Los colores están organizados por rol

`fondo`, `superficie`, `borde`, `acento`, `texto`, `textoSuave`, `textoTenue`,
`ok` / `atencion` / `peligro` / `neutro`, `burbujas`, `rutinas`. Una pantalla
pide "el color del texto", no "el blanco". Ver `src/tema/paletas.ts`.

### Contraste verificado, no estimado

```bash
cd app && npm run contraste
```

Calcula los 40 pares texto/fondo que usa la aplicación según WCAG 2.1 y falla
si alguno no llega al mínimo (4.5:1 texto normal, 3:1 texto grande y bordes).
Incluye el peor caso del fondo animado: las burbujas pasan por detrás del texto
y ahí es donde el contraste se cae sin que se note en una captura quieta.

La paleta está repetida dentro del script a propósito —corre con node pelado,
sin TypeScript—. Si se toca `src/tema/paletas.ts` hay que tocarla ahí también,
y esa fricción es sana: obliga a volver a correr la verificación.

---

## 3. Las reglas del diseño

1. **El tamaño sigue a la importancia.** El cuerpo arranca en 17px y ningún
   texto baja de 14px. El diseño anterior tenía títulos de 58px y acciones de
   12px en la misma pantalla: lo más grande era decorativo y lo más chico era
   lo que había que apretar.
2. **Lo que se toca mide al menos 48px**, y el botón principal 56. WCAG 2.2
   pide 44; acá el mínimo es más alto porque el dedo que aprieta puede ser el
   de alguien con artrosis o el de un enfermero con guantes.
3. **El color nunca es la única señal.** Cada estado lleva icono + palabra +
   color. Rojo y verde son el mismo gris para una persona daltónica, y el 8% de
   los varones lo es.
4. **Si el sistema pide menos movimiento, se lo respeta.** `useMovimientoReducido()`
   deja las burbujas del fondo quietas. Para alguien con vértigo o migraña
   vestibular un fondo animado no es decoración: marea.
5. **Una sola columna, con ancho máximo.** 620px el contenido, 400px los
   formularios de entrada. La app también corre en el navegador de una
   computadora, y sin el límite una línea cruzaba 1900px.

---

## 4. Las piezas de `ui/`

| Pieza | Para qué |
| --- | --- |
| `Pantalla` | El armazón: fondo, márgenes seguros y la columna de ancho limitado |
| `Fondo` | Las burbujas de lámpara de lava. Una sola vez, no copiado en cinco pantallas |
| `Encabezado` | Flecha de volver + título. Antes se volvía tocando el logo, sin ninguna señal |
| `Boton` | Principal (relleno) y secundario (borde). Se distinguen por relleno, así que también en escala de grises |
| `Campo` | Texto con la etiqueta **escrita arriba**, nunca como placeholder |
| `Selector` / `Opciones` | Desplegable con etiqueta, y elección entre pocas opciones a la vista |
| `Contador` | El − / + de cantidad. Se anuncia al lector de pantalla como control ajustable |
| `SelectorDias` | Los siete días como casillas de 48px, con tilde además del color |
| `Tarjeta`, `Estado`, `Aviso` | Contenedor, etiqueta de estado y mensaje. Los tres con icono |
| `Vacio` | Lista sin nada: dice qué pasa **y** qué hacer |
| `Cargando` | Espera con texto y `accessibilityLiveRegion`, no un circulito mudo |
| `CazaErrores` | Atrapa lo que se rompe fuera del renderizado y lo hace visible |
| `Dialogo` | Las confirmaciones. Montado una vez en el layout raíz; las pantallas no lo dibujan |
| `CampoFechaNacimiento` | Día / mes / año en tres desplegables, con el mes escrito |
| `AvisoDespertando` | La franja de "el servidor está arrancando" |

### Nada de `alert`, `confirm` ni `prompt`

**Está prohibido**, y no es una preferencia de estilo. El diálogo del navegador
lo dibuja el sistema con el título "voitos.vercel.app dice", que es exactamente
la forma de los avisos falsos; arriba de un texto sobre medicación, eso es lo
peor que puede aparecer. Además no respeta ningún color ni tamaño de acá, y
bloquea el hilo mientras está abierto.

Para preguntar algo:

```ts
const seguir = await confirmar(
  "Eliminar la cuenta de Timoteo",
  "Se borra con todo su historial.\n\nEsto no se puede deshacer. ¿Seguro?",
  "Eliminar cuenta",
  "peligro"   // pinta el botón en rojo
);
```

`confirmar()` vive en `lib/avisos.ts` y solo guarda cuál es la pregunta
pendiente; `ui/Dialogo.tsx` la dibuja. Están separados porque `lib/` no tiene
nada visual.

Para avisar sin preguntar: `Aviso` o `Estado`, dentro de la pantalla.

---

## 5. La versión web

La app es Expo Router, así que el mismo código va a celular y a navegador. Lo
que es exclusivo de web:

- **`src/app/+html.tsx`** reemplaza al HTML por defecto de Expo. Existe por un
  bug concreto: el pantallazo blanco al enfocar un campo en el celular. El
  fondo lo pintaba un componente de React que mide el alto de la ventana; al
  abrirse el teclado la ventana cambia de tamaño y lo que el componente deja de
  cubrir queda del blanco del navegador. La única forma de arreglarlo es pintar
  `html`, `body` y `#root`, y al documento no se llega desde React Native.
  Ahí también van el `theme-color` de la barra del navegador y el estilo de los
  `<select>` nativos, que no heredan nada de la aplicación.
- **Se prerenderiza** (`app.json`, `web.output: "static"`): el HTML se arma en
  un servidor y el navegador lo hidrata. De ahí sale `initialMetrics` en el
  `SafeAreaProvider` de `_layout.tsx`, sin el cual el servidor producía un
  árbol y el navegador otro, React tiraba el HTML prerenderizado y volvía a
  dibujar todo del lado del cliente.
- **`vercel.json`** compila con `npx expo export --platform web`, sirve `dist/`
  y reescribe todas las rutas a `index.html` para que expo-router funcione al
  recargar en una URL profunda.

### Compilar y verificar

```bash
cd app
npx tsc --noEmit          # tipos
npm run contraste         # accesibilidad de la paleta
npm run build:web         # el export que sube a Vercel
```

### Dónde vive la app

**`https://voitos.vercel.app`**. Esa es la dirección, y no cambia.

El deploy es automático: Vercel está enganchado al repositorio y compila con
cada push. Lo que sale de `main` va a `voitos.vercel.app`; lo que sale de
cualquier otra rama va a una *preview* con una dirección larga del tipo
`app-git-<rama>-timos-projects-….vercel.app`.

Esa distinción importa más de lo que parece: una preview es para mirar una rama
antes de mergearla y se pisa con el push siguiente. No se comparte ni se pasa
como si fuera la aplicación. **Un cambio no está publicado hasta que llegó a
`main`.**

---

## 6. La landing

La landing que hizo el equipo vive en **`voitos.vercel.app/landing`**, adentro
de la misma app. Se entra desde una tarjeta al final del inicio
(`components/TarjetaLanding.tsx`) y se vuelve tocando su logo.

### Es una copia, y no se reescribe

`app/public/landing` es el **build de Vite tal cual lo publicó su autor**: un
HTML, un CSS, un JS y las imágenes. Expo copia `public/` al build sin tocarlo.

No se portó a React Native a propósito. Se perderían justamente las cosas que
la hacen: el cursor-pastilla, las chispas, la explosión del logo, las tarjetas
que se inclinan y las secciones que aparecen al scrollear. Copiada así, en
escritorio es idéntica a la original: medida elemento por elemento, los 200
tienen la misma posición, tamaño, letra y color.

Por la misma razón, la tarjeta entra con una navegación completa
(`window.location`) y no con `router.push`: el router no la conoce.

### Lo único que se le tocó

Todo está a la vista y separado del código del autor:

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Rutas `/assets/` → `/landing/assets/` | `index.html` | Ahora vive en una subcarpeta. Absolutas, así andan con o sin barra final |
| El logo apunta a la app | `index.html` (`href` y etiqueta) + final del JS | Para volver. A `/home` si hay sesión, a la portada si no. Espera a que termine la explosión del logo |
| Chispas al tocar en celular | Final del JS | El original las limita a mouse. Van en `click`, así arrastrar para scrollear no las dispara |
| Diseño de celular | Final del CSS | Ver abajo |

Los agregados al JS y al CSS están **al final de cada archivo**, cada uno con
su comentario. El código original no se modificó.

### El diseño de celular

La landing ya venía preparada para celular, pero todo era enorme: los bloques
de "¿Qué resuelve?" medían 250px cada uno y el teléfono ocupaba tres
pantallas. La página medía 6313px de alto a 375px de ancho; ahora 4155px.

Solo cambian tamaños y posiciones: mismo contenido, mismos colores, mismas
animaciones. Todo va en un único `@media (width<=760px)` al final del CSS, así
que **escritorio no se entera**.

Dos cosas que no funcionaron, para no volver a probarlas:

- **Ocultar los `<br>`** para que el texto fluya: en el HTML no hay espacio
  alrededor del salto, así que pegaba palabras ("unadosis", "necesitansaber").
- **Tarjetas en 2x2:** quedaban angostas, y los cortes de línea del autor
  dejaban palabras solas en un renglón ("está", "su"). Por eso una columna.

### Si el autor publica una versión nueva

1. Bajar el HTML, el CSS, el JS y las imágenes nuevos a `app/public/landing`.
2. Volver a aplicar lo de la tabla de arriba: las rutas y el logo en el HTML, y
   los bloques del final del CSS y del JS (están en el historial de git).
3. Actualizar en `TarjetaLanding.tsx` los nombres de la foto y el logo: llevan
   el hash del build de Vite y cambian con cada build.

### En Vercel

`vercel.json` manda todas las rutas a la app (`/(.*)` → `/index.html`). Los
archivos reales ganan igual, que es por lo que cargan los `.js` de `/_expo`.
Pero `/landing` es una carpeta y no un archivo, así que tiene sus propias reglas
explícitas antes de la general.

En local, `npx serve` no sirve para probarla: con `--single` devuelve la app en
`/landing/`, y sin él redirige `index.html` por las "URLs limpias". Con
`npx http-server app/dist` se comporta como Vercel.

### La tarjeta del inicio

Usa la foto y el logo de la misma landing, así anticipa lo que se va a ver. El
hover sigue el lenguaje de la app: el borde pasa al verde de la marca, como los
botones; la foto se acerca y se aclara, la flecha avanza, y la tarjeta se
levanta con el mismo brillo verde que usa la landing. Con teclado aparece el
anillo de foco; con movimiento reducido solo cambian los colores.

La foto va **pegada arriba con su proporción (4:3)** y la tarjeta recorta lo
que sobra. react-native-web la dibuja como fondo CSS centrado y no deja mover
esa posición (`objectPosition` no hace nada), así que centrada cortaba las caras
en escritorio.

---

## 7. Un detalle que cuesta caro olvidar

Los hooks se llaman `useAlgo` y no `usarAlgo`, aunque el resto del código está
en castellano. El prefijo `use` no es estilo: es cómo React reconoce un hook, y
este proyecto tiene el **React Compiler prendido** (`app.json`,
`experiments.reactCompiler`). A lo que no lleva ese prefijo lo trata como una
función común y memoriza su resultado. Con los hooks llamados `usarColores` y
`usarEstilos`, el compilador cacheaba la hoja de estilos como si fuera una
constante: la pantalla se quedaba con estilos viejos y no había ningún error en
consola.
