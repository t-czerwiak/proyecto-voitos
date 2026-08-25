import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// El documento HTML que envuelve toda la aplicacion en web.
//
// Existe por una sola razon, y es un bug concreto: el pantallazo blanco al
// tocar un campo en el celular.
//
// El fondo oscuro de la aplicacion lo pintaba un componente de React, que mide
// exactamente el alto de la ventana. Atras de ese componente no habia nada: el
// reset de Expo deja html, body y #root en 100% de alto pero SIN color. Cuando
// se enfoca un campo se abre el teclado, la ventana cambia de tamano, y todo lo
// que el componente deja de cubrir queda del blanco por defecto del navegador.
// En iOS es peor, porque el teclado no achica la ventana sino que empuja la
// pagina hacia arriba y deja ver el vacio de abajo.
//
// La unica forma de arreglarlo es pintar el documento en si, y el documento no
// se alcanza desde React Native: hay que hacerlo aca.
//
// Ojo con este archivo: reemplaza al HTML por defecto de Expo, asi que lo que
// no este escrito aca no existe. Por eso van el charset, el viewport y el
// ScrollViewStyleReset, que son los que traia de fabrica.
//
// Corre SOLO en Node al compilar, nunca en el navegador. No importar CSS global
// desde aca; eso va en _layout.tsx.

// Los dos fondos, escritos y no importados a proposito: este archivo se
// ejecuta en el build de Node, fuera del arbol de React Native, y arrastrar el
// tema entero hasta aca para leer dos cadenas no vale la pena. Tienen que ser
// los mismos valores que `fondo` en src/tema/paletas.ts.
const FONDO_OSCURO = "#010D07";
const FONDO_CLARO = "#F1F5F1";
const TEXTO_OSCURO = "#FFFFFF";
const TEXTO_CLARO = "#0A1912";
const SUPERFICIE_CLARA = "#FFFFFF";

// Elige el tema ANTES de que se pinte el primer cuadro.
//
// El tema lo decide React, pero React arranca despues de que el navegador ya
// dibujo el documento. Si el fondo del documento estuviera clavado en oscuro,
// alguien con el modo claro elegido veria un destello negro en cada carga; y al
// reves.
//
// Este script corre en el <head>, antes de cualquier pintada, lee la misma
// clave que usa TemaProvider y estampa el resultado en <html>. Es la misma
// tecnica que usan las paginas con modo oscuro para evitar el parpadeo.
//
// Va sin defer y sin async a proposito: tiene que bloquear, son tres lineas.
const ELEGIR_TEMA = `
(function () {
  try {
    var g = localStorage.getItem("voitos_tema");
    var oscuro =
      g === "oscuro" ||
      (g !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.tema = oscuro ? "oscuro" : "claro";
  } catch (e) {
    document.documentElement.dataset.tema = "oscuro";
  }
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Pinta la barra de estado del navegador del celular del mismo color,
            asi la aplicacion no queda con una franja de otro color arriba. El
            navegador elige segun el tema del sistema; cuando la persona cambia
            el tema a mano, TemaProvider reescribe esta etiqueta. */}
        <meta name="theme-color" content={FONDO_OSCURO} media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content={FONDO_CLARO} media="(prefers-color-scheme: light)" />

        <script dangerouslySetInnerHTML={{ __html: ELEGIR_TEMA }} />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          /* El oscuro es el de la marca, asi que es el que vale si por lo que
             sea no se llego a estampar el atributo. */
          html, body, #root { background-color: ${FONDO_OSCURO}; }

          html[data-tema="claro"], html[data-tema="claro"] body,
          html[data-tema="claro"] #root { background-color: ${FONDO_CLARO}; }

          /* El desplegable de hora y minutos es un <select> nativo, y sus
             opciones no heredan nada del estilo de la aplicacion: se abrian
             como una lista blanca que en el celular tapa la pantalla entera y
             parece que la aplicacion se rompio. */
          select, select option {
            background-color: ${FONDO_OSCURO};
            color: ${TEXTO_OSCURO};
          }

          html[data-tema="claro"] select,
          html[data-tema="claro"] select option {
            background-color: ${SUPERFICIE_CLARA};
            color: ${TEXTO_CLARO};
          }
        ` }} />
      </head>

      <body>{children}</body>
    </html>
  );
}
