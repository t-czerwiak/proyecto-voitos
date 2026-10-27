import React from "react";
import { useWindowDimensions, View } from "react-native";
import { crearEstilos, espacio } from "../tema";

export const ANCHO_ESCRITORIO = 900;

export const useEscritorio = () => useWindowDimensions().width >= ANCHO_ESCRITORIO;

type Props = {
  principal: React.ReactNode;
  lateral: React.ReactNode;
};

export default function Columnas({ principal, lateral }: Props) {
  const styles = useEstilos();

  if (!useEscritorio()) {
    return (
      <>
        {principal}
        {lateral}
      </>
    );
  }

  return (
    <View style={styles.fila}>
      <View style={styles.principal}>{principal}</View>
      <View style={styles.lateral}>{lateral}</View>
    </View>
  );
}

const useEstilos = crearEstilos(() => ({
  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espacio.xxl,
  },

  principal: {
    flex: 2,
    minWidth: 0,
  },

  lateral: {
    flex: 1,
    minWidth: 0,
  },
}));
