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

// Tiene que ser el mismo valor que colores.fondo en src/tema/colores.ts.
// Va escrito y no importado a proposito: este archivo se ejecuta en el build de
// Node, fuera del arbol de React Native, y arrastrar el tema entero hasta aca
// para leer una cadena no vale la pena.
const FONDO = "#010D07";

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
            asi la aplicacion no queda con una franja clara arriba. */}
        <meta name="theme-color" content={FONDO} />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root { background-color: ${FONDO}; }

          /* El desplegable de hora y minutos es un <select> nativo, y sus
             opciones no heredan nada del estilo de la aplicacion: se abrian
             como una lista blanca que en el celular tapa la pantalla entera y
             parece que la aplicacion se rompio. */
          select, select option {
            background-color: ${FONDO};
            color: #FFFFFF;
          }
        ` }} />
      </head>

      <body>{children}</body>
    </html>
  );
}
