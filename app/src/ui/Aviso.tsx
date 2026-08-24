import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colores, espacio, radio, texto } from "../tema";

type Tipo = "error" | "ok" | "atencion" | "info";

type Props = {
  texto?: string;
  tipo?: Tipo;
  titulo?: string;
};

const ESTILOS: Record<
  Tipo,
  { fondo: string; borde: string; color: string; icono: keyof typeof Ionicons.glyphMap; nombre: string }
> = {
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
};

// Un mensaje en pantalla: el error de un formulario, la confirmacion de que
// algo se guardo.
//
// Tres cosas que antes no hacia:
//
//   - Lleva icono ademas de color. Rojo y verde son el mismo gris para una
//     persona daltonica, y el 8% de los varones lo es.
//   - Es una live region: cuando aparece, el lector de pantalla lo lee solo.
//     Antes el mensaje se dibujaba y quien no lo veia no se enteraba de nada.
//   - El texto arranca en 17px. El anterior era de 14 centrado, que para un
//     mensaje de error de tres renglones es incomodo de leer.
export default function Aviso({ texto: contenido, tipo = "error", titulo }: Props) {
  if (!contenido) return null;

  const e = ESTILOS[tipo];

  return (
    <View
      style={[styles.caja, { backgroundColor: e.fondo, borderColor: e.borde }]}
      // "polite" y no "assertive": avisa sin cortarle la palabra al lector si
      // estaba leyendo otra cosa.
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

const styles = StyleSheet.create({
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
});
