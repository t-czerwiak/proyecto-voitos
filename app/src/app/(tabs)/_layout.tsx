import { Stack } from "expo-router";
import { useColores } from "../../tema";

// Este grupo era un Tabs con la barra escondida (`tabBarStyle: display none`).
// Escondida para el ojo, pero no para el resto: en el navegador seguia
// existiendo un `tablist` con siete pestañas —incluidas "emergencia" y
// "configuracion", que no estan implementadas—, asi que un lector de pantalla
// anunciaba una navegacion por pestañas que no existe.
//
// La aplicacion nunca uso pestañas: se mueve con router.push. Un Stack es lo
// que siempre fue, y las rutas no cambian: el nombre del grupo entre
// parentesis no forma parte de la URL.
export default function GrupoPrincipal() {
  const colores = useColores();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    />
  );
}
