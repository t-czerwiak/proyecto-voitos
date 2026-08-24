import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colores } from "../tema";

// El fondo de la aplicacion.
//
// Es el mismo degradado verde de siempre, pero quieto. Antes habia tres
// manchas girando y desplazandose sin parar, en todas las pantallas y sin
// forma de apagarlas: mareaba a quien tiene vertigo, distraia a quien estaba
// leyendo una dosis y hacia trabajar a la GPU del telefono todo el tiempo.
//
// Lo que queda son dos halos fijos, del mismo verde. Dan la misma profundidad
// sin moverse. No hay nada que animar, asi que tampoco hay nada que reducir.
export default function Fondo() {
  return (
    <LinearGradient
      colors={colores.degradado}
      style={StyleSheet.absoluteFill}
      // El aria-hidden del mundo nativo: es decoracion, y un lector de
      // pantalla no tiene nada que anunciar aca.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View style={[styles.halo, styles.haloArriba]} />
      <View style={[styles.halo, styles.haloAbajo]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
    backgroundColor: colores.acento,
    // Muy tenue: tiene que sugerir volumen, no competir con el contenido.
    opacity: 0.06,
    borderRadius: 999,
  },

  haloArriba: {
    width: 420,
    height: 420,
    top: -160,
    left: -140,
  },

  haloAbajo: {
    width: 360,
    height: 360,
    bottom: -140,
    right: -120,
  },
});
