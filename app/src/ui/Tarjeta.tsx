import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { colores, espacio, radio } from "../tema";

type Props = {
  children: React.ReactNode;
  // Si se puede tocar, la tarjeta entera es el area de toque: no hay que
  // acertarle a un enlace chiquito adentro.
  onPress?: () => void;
  etiqueta?: string;
  ayuda?: string;
  // Para lo que tiene que despegarse del resto: la proxima dosis, la fila
  // seleccionada.
  destacada?: boolean;
  // Franja de color al costado, del color de la rutina.
  franja?: string;
  estilo?: ViewStyle;
};

type EstadoPress = { pressed: boolean; hovered?: boolean; focused?: boolean };

export default function Tarjeta({
  children,
  onPress,
  etiqueta,
  ayuda,
  destacada = false,
  franja,
  estilo,
}: Props) {
  const contenido = (
    <>
      {franja && <View style={[styles.franja, { backgroundColor: franja }]} />}
      <View style={styles.contenido}>{children}</View>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.caja, destacada && styles.destacada, estilo]}>
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={ayuda}
      style={(estadoBase) => {
        const estado = estadoBase as EstadoPress;
        return [
          styles.caja,
          destacada && styles.destacada,
          (estado.pressed || estado.hovered) && styles.activa,
          estado.focused && styles.enfocada,
          estilo,
        ];
      }}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    marginBottom: espacio.md,
    overflow: "hidden",
  },

  destacada: {
    backgroundColor: colores.superficieAlta,
    borderColor: colores.acento,
  },

  activa: {
    backgroundColor: colores.superficieAlta,
    borderColor: colores.bordeFuerte,
  },

  enfocada: {
    borderColor: colores.texto,
  },

  franja: {
    width: 8,
  },

  contenido: {
    flex: 1,
    padding: espacio.lg,
  },
});
