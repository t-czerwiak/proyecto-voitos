import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Mensaje de feedback en pantalla.
//
// Reemplaza a los dialogos del navegador: quedan fuera del diseno y en
// react-native-web el Alert de React Native ni siquiera funciona (esta
// implementado como una funcion vacia).
//
// Si no hay texto no renderiza nada, asi no ocupa lugar cuando no hace falta.

type Props = {
  texto?: string;
  tipo?: "error" | "ok";
};

export default function Mensaje({ texto, tipo = "error" }: Props) {
  if (!texto) return null;

  const esOk = tipo === "ok";

  return (
    <View style={[styles.caja, esOk ? styles.cajaOk : styles.cajaError]}>
      <Text style={[styles.texto, esOk ? styles.textoOk : styles.textoError]}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    width: "85%",
    maxWidth: 400,
    alignSelf: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
  },

  cajaError: {
    backgroundColor: "rgba(60, 8, 8, 0.85)",
    borderColor: "#8B2E2E",
  },

  cajaOk: {
    backgroundColor: "rgba(1, 37, 14, 0.85)",
    borderColor: "#105a2c",
  },

  texto: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 19,
  },

  textoError: {
    color: "#FF9B9B",
  },

  textoOk: {
    color: "#7CFFB0",
  },
});
