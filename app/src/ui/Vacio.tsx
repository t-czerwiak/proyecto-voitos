import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Boton from "./Boton";
import { crearEstilos, useColores, espacio, radio, texto } from "../tema";

type Props = {
  icono?: keyof typeof Ionicons.glyphMap;
  titulo: string;

  detalle?: string;
  accion?: { titulo: string; onPress: () => void };
};

export default function Vacio({ icono = "calendar-outline", titulo, detalle, accion }: Props) {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <View style={styles.caja}>
      <Ionicons name={icono} size={34} color={colores.textoTenue} />

      <Text style={styles.titulo}>{titulo}</Text>

      {detalle && <Text style={styles.detalle}>{detalle}</Text>}

      {accion && (
        <View style={styles.accion}>
          <Boton titulo={accion.titulo} onPress={accion.onPress} variante="secundario" />
        </View>
      )}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    alignItems: "center",
    gap: espacio.sm,
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderStyle: "dashed",
    borderRadius: radio.lg,
    paddingVertical: espacio.xl,
    paddingHorizontal: espacio.lg,
    marginBottom: espacio.md,
  },

  titulo: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
    textAlign: "center",
  },

  detalle: {
    ...texto.dato,
    color: colores.textoTenue,
    textAlign: "center",
  },

  accion: {
    width: "100%",
    maxWidth: 320,
    marginTop: espacio.sm,
  },
}));
