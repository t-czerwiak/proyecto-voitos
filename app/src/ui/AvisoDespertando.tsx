import React, { useSyncExternalStore } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  crearEstilos,
  useColores,
  espacio,
  radio,
  texto,
  ANCHO_FORMULARIO,
} from "../tema";
import {
  leerDespertar,
  leerDespertarEnServidor,
  suscribirDespertar,
} from "../lib/api";

// La franja que aparece cuando el backend estaba dormido y se lo esta
// esperando.
//
// El backend vive en Render con el plan free, que apaga el servicio a los 15
// minutos sin trafico; despertarlo tarda entre 30 y 60 segundos. El cliente de
// api.ts reintenta solo, pero ese reintento son 45 segundos en los que no pasa
// nada en pantalla. Sin este aviso, esos 45 segundos se ven exactamente igual
// que una aplicacion colgada, y lo razonable es recargar la pagina, que es lo
// peor que se puede hacer: tira el intento que ya estaba por salir bien.
//
// Va arriba de todo y EN EL FLUJO, no flotando: empuja las pantallas hacia
// abajo mientras esta y las devuelve a su lugar cuando se va. Flotando tapaba
// el titulo de la pantalla, que es justo lo que hay que poder leer.
//
// No es un error, es un "esto va a tardar": por eso no bloquea nada ni corta lo
// que la persona estaba mirando.
export default function AvisoDespertando() {
  const despertando = useSyncExternalStore(
    suscribirDespertar,
    leerDespertar,
    leerDespertarEnServidor
  );

  const colores = useColores();
  const styles = useEstilos();
  const margenes = useSafeAreaInsets();

  if (!despertando) return null;

  return (
    <View style={[styles.capa, { paddingTop: margenes.top + espacio.sm }]}>
      <View
        style={styles.franja}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <ActivityIndicator color={colores.atencion.texto} />
        <Text style={styles.texto}>
          El servidor estaba dormido y está arrancando. Puede tardar hasta un
          minuto; no recargues la página.
        </Text>
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  capa: {
    alignItems: "center",
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.sm,
  },

  franja: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
    width: "100%",
    maxWidth: ANCHO_FORMULARIO,
    backgroundColor: colores.atencion.fondo,
    borderWidth: 2,
    borderColor: colores.atencion.borde,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },

  texto: {
    ...texto.dato,
    color: colores.atencion.texto,
    flexShrink: 1,
  },
}));
