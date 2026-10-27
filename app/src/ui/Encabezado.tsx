import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";
import { useEscritorio } from "./Columnas";

type Props = {
  titulo: string;

  bajada?: string;

  volverA?: Href;

  sinVolver?: boolean;

  principal?: boolean;
};

export default function Encabezado({ titulo, bajada, volverA, sinVolver, principal }: Props) {
  const styles = useEstilos();
  const colores = useColores();
  const escritorio = useEscritorio();
  const conVolver = !sinVolver && !(principal && escritorio);

  const volver = () => {
    if (volverA) {
      router.push(volverA);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push("/home");
  };

  return (
    <View style={styles.caja}>
      {conVolver && (
        <Pressable
          onPress={volver}
          style={({ pressed }) => [styles.volver, pressed && styles.volverActivo]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={30} color={colores.acento} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
      )}

      <Text style={styles.titulo} accessibilityRole="header">
        {titulo}
      </Text>

      {bajada && <Text style={styles.bajada}>{bajada}</Text>}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    marginBottom: espacio.xl,
  },

  volver: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: espacio.sm,
    minHeight: toque.comodo,
    paddingRight: espacio.lg,
    paddingVertical: espacio.md,
    borderRadius: radio.sm,
    marginBottom: espacio.sm,
  },

  volverActivo: {
    backgroundColor: colores.superficie,
  },

  volverTexto: {
    ...texto.cuerpoFuerte,

    fontSize: 20,
    lineHeight: 28,
    color: colores.acento,
  },

  titulo: {
    ...texto.titulo,
    color: colores.texto,
  },

  bajada: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },
}));
