import React from "react";
import { View } from "react-native";
import { crearEstilos, useColores } from "../tema";

export const TAMANOS = [
  { valor: "chico", etiqueta: "Chica" },
  { valor: "mediano", etiqueta: "Mediana" },
  { valor: "grande", etiqueta: "Grande" },
  { valor: "pildora", etiqueta: "Píldora" },
] as const;

export const etiquetaTamano = (tipo?: string) => TAMANOS.find((t) => t.valor === tipo)?.etiqueta ?? null;

const BLANCO = "#EEF8F1";
const RAYA = "rgba(1, 13, 7, 0.22)";

export default function IconoPastilla({ tipo, tam = 40 }: { tipo?: string; tam?: number }) {
  const styles = useEstilos();
  const colores = useColores();

  const comprimido = (diametro: number) => (
    <View
      style={[
        styles.comprimido,
        { width: diametro, height: diametro, borderRadius: diametro / 2, borderWidth: Math.max(1, tam * 0.03) },
      ]}
    >
      <View style={[styles.raya, { width: 2, height: diametro * 0.62 }]} />
    </View>
  );

  let forma: React.ReactNode;
  if (tipo === "pildora") {
    const largo = tam * 0.9;
    const alto = tam * 0.38;
    forma = (
      <View
        style={[
          styles.capsula,
          { width: largo, height: alto, borderRadius: alto / 2, transform: [{ rotate: "-35deg" }] },
        ]}
      >
        <View style={[styles.mitad, { backgroundColor: colores.acento }]} />
        <View style={[styles.mitad, { backgroundColor: BLANCO }]} />
      </View>
    );
  } else if (tipo === "grande") {
    const largo = tam * 0.9;
    const alto = tam * 0.46;
    forma = (
      <View
        style={[
          styles.comprimido,
          {
            width: largo,
            height: alto,
            borderRadius: alto / 2,
            borderWidth: Math.max(1, tam * 0.03),
            transform: [{ rotate: "-25deg" }],
          },
        ]}
      >
        <View style={[styles.raya, { width: 2, height: alto * 0.62 }]} />
      </View>
    );
  } else if (tipo === "mediano") {
    forma = comprimido(tam * 0.66);
  } else {
    forma = comprimido(tam * 0.44);
  }

  return (
    <View
      style={[styles.caja, { width: tam, height: tam }]}
      accessibilityLabel={etiquetaTamano(tipo) ? `Pastilla ${etiquetaTamano(tipo)!.toLowerCase()}` : undefined}
    >
      {forma}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    alignItems: "center",
    justifyContent: "center",
  },

  comprimido: {
    backgroundColor: BLANCO,
    borderColor: colores.acentoSuave,
    alignItems: "center",
    justifyContent: "center",
  },

  raya: {
    backgroundColor: RAYA,
    borderRadius: 1,
  },

  capsula: {
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colores.acentoSuave,
  },

  mitad: {
    flex: 1,
  },
}));
