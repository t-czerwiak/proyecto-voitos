import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const FONDO = "#010D07";
const TEXTO = "#FFFFFF";

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

        <meta name="theme-color" content={FONDO} />

        <meta name="color-scheme" content="dark" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root { background-color: ${FONDO}; }

          /* El desplegable de hora y minutos es un <select> nativo, y sus
             opciones no heredan nada del estilo de la aplicacion: se abrian
             como una lista blanca que en el celular tapa la pantalla entera y
             parece que la aplicacion se rompio. */
          select, select option {
            background-color: ${FONDO};
            color: ${TEXTO};
          }
        ` }} />
      </head>

      <body>{children}</body>
    </html>
  );
}
