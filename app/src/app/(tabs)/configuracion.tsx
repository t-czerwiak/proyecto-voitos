// Pantalla "configuracion": todavia sin implementar.
//
// No forma parte del alcance de la demo, queda para una etapa posterior. El
// archivo existe para no romper las rutas de expo-router, que arma la
// navegacion a partir de los archivos de esta carpeta.
//
// Antes devolvia null, asi que quien llegaba escribiendo la URL veia una
// pantalla en blanco sin ninguna salida. Ahora al menos dice que pasa y como
// volver.

import React from "react";
import { Pantalla, Encabezado, Vacio } from "../../ui";

export default function configuracion() {
  return (
    <Pantalla>
      <Encabezado titulo="Todavía no está" volverA="/home" />

      <Vacio
        icono="construct-outline"
        titulo="Esta sección todavía no está hecha"
        detalle="Queda para más adelante. Por ahora, todo lo que anda está en el inicio."
      />
    </Pantalla>
  );
}
