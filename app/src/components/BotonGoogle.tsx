import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { dibujarBotonGoogle, googleDisponible } from "../lib/google";
import { iniciarSesionConGoogle, destinoAlEntrar } from "../lib/voitos";
import { Aviso } from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

export default function BotonGoogle({
  separador = "arriba",
  leyenda = "o",
}: {
  separador?: "arriba" | "abajo" | "ninguno";
  leyenda?: string;
} = {}) {
  const styles = useEstilos();

  const contenedor = useRef<View | null>(null);
  const [error, setError] = useState("");
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    if (!googleDisponible()) return;

    if (!ancho) return;

    const nodo = contenedor.current as unknown as HTMLElement | null;
    if (!nodo) return;

    let vivo = true;

    dibujarBotonGoogle(
      nodo,
      async (idToken) => {
        setError("");
        try {
          await iniciarSesionConGoogle(idToken);
          router.replace(await destinoAlEntrar());
        } catch (e: any) {
          if (vivo) setError(e.message);
        }
      },
      ancho
    ).catch((e: any) => {
      if (vivo) setError(e.message);
    });

    return () => {
      vivo = false;
    };
  }, [ancho]);

  if (!googleDisponible()) return null;

  return (
    <View
      style={styles.caja}

      onLayout={(e) => {
        const medido = Math.round(e.nativeEvent.layout.width);

        const valido = Math.max(200, Math.min(400, medido));
        setAncho((actual) => (actual === valido ? actual : valido));
      }}
    >
      {separador === "arriba" && <Raya leyenda={leyenda} styles={styles} />}

      <View ref={contenedor} style={styles.hueco} />

      <Aviso texto={error} />

      {separador === "abajo" && <Raya leyenda={leyenda} styles={styles} />}
    </View>
  );
}

function Raya({ leyenda, styles }: { leyenda: string; styles: any }) {
  return (
    <View style={styles.separador} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.linea} />
      <Text style={styles.oTexto}>{leyenda}</Text>
      <View style={styles.linea} />
    </View>
  );
}

const ALTO_GOOGLE = 40;

const useEstilos = crearEstilos((colores) => ({
  caja: {
    alignItems: "center",
    width: "100%",
    gap: espacio.lg,
    marginTop: espacio.lg,
  },

  separador: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: espacio.md,
  },

  linea: {
    flex: 1,
    height: 1,
    backgroundColor: colores.borde,
  },

  oTexto: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  hueco: {
    height: ALTO_GOOGLE,
    width: "100%",
    borderRadius: radio.lg,

    overflow: "hidden",
  },
}));
