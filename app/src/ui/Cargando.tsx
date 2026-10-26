import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { crearEstilos, useColores, espacio, texto } from "../tema";

export default function Cargando({ texto: contenido = "Cargando..." }: { texto?: string }) {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <View style={styles.caja} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colores.acento} size="large" />
      <Text style={styles.texto}>{contenido}</Text>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    alignItems: "center",
    gap: espacio.md,
    paddingVertical: espacio.xxl,
  },

  texto: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },
}));
