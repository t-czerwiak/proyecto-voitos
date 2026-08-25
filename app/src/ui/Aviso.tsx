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

// Igual que en Estado: la tabla depende del tema, asi que se arma con la
// paleta en vez de quedar clavada al cargar el modulo.
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
  // Los dos hooks van ARRIBA del "if (!contenido) return null", no abajo.
  //
  // React identifica cada hook por el orden en que se llama, asi que uno que
  // queda detras de un return temprano se llama en unos renders y en otros no,
  // y a partir de ahi React lee mal todo el estado del componente. No falla
  // ruidosamente: descoloca los valores.
  const styles = useEstilos();
  const colores = useColores();

  if (!contenido) return null;

  const e = estilosDe(colores)[tipo];

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
