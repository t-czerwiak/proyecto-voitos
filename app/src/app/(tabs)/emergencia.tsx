import React from "react";
import { Pantalla, Encabezado, Vacio } from "../../ui";

export default function emergencia() {
  return (
    <Pantalla>
      <Encabezado titulo="Todavía no está" volverA="/home" />

      <Vacio
        icono="construct-outline"
        titulo="Esta sección todavía no está hecha"
      />
    </Pantalla>
  );
}
