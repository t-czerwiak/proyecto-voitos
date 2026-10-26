import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, espacio, radio, texto, Paleta } from "../tema";

type Tipo = "error" | "ok" | "atencion" | "info";

type Props = {
  texto?: string;
  tipo?: Tipo;
  titulo?: string;
};

const estilosDe = (
  colores: Paleta
): Record<
  Tipo,
  { fondo: string; borde: string; color: string; icono: keyof typeof Ionicons.glyphMap; nombre: string }
> => ({
  error: {
    fondo: colores.peligro.fondo,
    borde: colores.peligro.borde,
    color: colores.peligro.texto,
    icono: "alert-circle",
    nombre: "Error",
  },
  ok: {
    fondo: colores.ok.fondo,
    borde: colores.ok.borde,
    color: colores.ok.texto,
    icono: "checkmark-circle",
    nombre: "Listo",
  },
  atencion: {
    fondo: colores.atencion.fondo,
    borde: colores.atencion.borde,
    color: colores.atencion.texto,
    icono: "warning",
    nombre: "Atención",
  },
  info: {
    fondo: colores.neutro.fondo,
    borde: colores.neutro.borde,
    color: colores.neutro.texto,
    icono: "information-circle",
    nombre: "Aviso",
  },
});

export default function Aviso({ texto: contenido, tipo = "error", titulo }: Props) {
  const styles = useEstilos();
  const colores = useColores();

  if (!contenido) return null;

  const e = estilosDe(colores)[tipo];

  return (
    <View
      style={[styles.caja, { backgroundColor: e.fondo, borderColor: e.borde }]}

      accessibilityLiveRegion="polite"
      role="alert"
    >
      <Ionicons name={e.icono} size={22} color={e.color} style={styles.icono} />

      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: e.color }]}>{titulo ?? e.nombre}</Text>
        <Text style={[styles.cuerpo, { color: e.color }]}>{contenido}</Text>
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espacio.md,
    borderWidth: 2,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginBottom: espacio.lg,
  },

  icono: {
    marginTop: 2,
  },

  textos: {
    flex: 1,
  },

  titulo: {
    ...texto.etiqueta,
    marginBottom: espacio.xs,
  },

  cuerpo: {
    ...texto.cuerpo,
  },
}));
