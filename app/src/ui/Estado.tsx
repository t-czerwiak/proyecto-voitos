import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, espacio, radio, texto, Paleta } from "../tema";

type Tono = "ok" | "atencion" | "peligro" | "neutro";

type Props = {
  texto: string;
  tono?: Tono;
  icono?: keyof typeof Ionicons.glyphMap;
};

// La tabla se arma con la paleta activa: los mismos roles cambian de color
// segun el tema.
const tonosDe = (
  colores: Paleta
): Record<Tono, { fondo: string; borde: string; color: string; icono: keyof typeof Ionicons.glyphMap }> => ({
  ok: {
    fondo: colores.ok.fondo,
    borde: colores.ok.borde,
    color: colores.ok.texto,
    icono: "checkmark-circle",
  },
  atencion: {
    fondo: colores.atencion.fondo,
    borde: colores.atencion.borde,
    color: colores.atencion.texto,
    icono: "warning",
  },
  peligro: {
    fondo: colores.peligro.fondo,
    borde: colores.peligro.borde,
    color: colores.peligro.texto,
    icono: "close-circle",
  },
  neutro: {
    fondo: colores.neutro.fondo,
    borde: colores.neutro.borde,
    color: colores.neutro.texto,
    icono: "time-outline",
  },
});

// La etiqueta de estado de una dosis, una cuenta o un modulo.
//
// Siempre lleva las tres cosas juntas: icono, palabra y color. El punto de
// color solo —como el que marcaba las cuentas verificadas en el panel— no le
// dice nada a quien no distingue el verde del ambar, ni a quien escucha la
// pantalla en vez de verla.
export default function Estado({ texto: contenido, tono = "neutro", icono }: Props) {
  const styles = useEstilos();

  const colores = useColores();
  const t = tonosDe(colores)[tono];

  return (
    <View style={[styles.caja, { backgroundColor: t.fondo, borderColor: t.borde }]}>
      <Ionicons name={icono ?? t.icono} size={16} color={t.color} />
      <Text style={[styles.texto, { color: t.color }]}>{contenido}</Text>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: espacio.xs,
    borderWidth: 1,
    borderRadius: radio.redondo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },

  texto: {
    ...texto.etiqueta,
  },
}));
