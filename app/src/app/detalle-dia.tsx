// Pantalla "detalle-dia": todavia sin implementar.
//
// El detalle de un dia hoy se ve en el propio calendario, tocando el dia. Este
// archivo existe para no romper las rutas de expo-router.

import React from "react";
import { Pantalla, Encabezado, Vacio } from "../ui";
import { router } from "expo-router";

export default function DetalleDia() {
  return (
    <Pantalla>
      <Encabezado titulo="Todavía no está" volverA="/home" />

      <Vacio
        icono="construct-outline"
        titulo="Esta pantalla todavía no está hecha"
        detalle="Lo que hay agendado cada día se ve en el calendario, tocando el día."
        accion={{
          titulo: "Ir al calendario",
          onPress: () => router.push("/calendario"),
        }}
      />
    </Pantalla>
  );
}
