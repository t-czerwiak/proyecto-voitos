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
