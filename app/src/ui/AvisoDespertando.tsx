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
