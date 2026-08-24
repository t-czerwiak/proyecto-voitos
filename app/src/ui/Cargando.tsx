import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colores, espacio, texto } from "../tema";

// La espera, con texto.
//
// Un circulito girando solo no dice que se esta esperando ni cuanto puede
// tardar, y para quien escucha la pantalla no existe. Con accessibilityLiveRegion
// el lector anuncia "Buscando las dosis..." cuando aparece.
export default function Cargando({ texto: contenido = "Cargando..." }: { texto?: string }) {
  return (
    <View style={styles.caja} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colores.acento} size="large" />
      <Text style={styles.texto}>{contenido}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
