import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Fondo from "./Fondo";
import { ANCHO_FORMULARIO, ANCHO_MAXIMO, crearEstilos, espacio } from "../tema";

type Props = {
  children: React.ReactNode;

  scroll?: boolean;

  centrado?: boolean;

  angosta?: boolean;
  estiloContenido?: ViewStyle;
};

export default function Pantalla({
  children,
  scroll = true,
  centrado = false,
  angosta = false,
  estiloContenido,
}: Props) {
  const styles = useEstilos();
  const columna = (
    <View
      style={[
        styles.columna,
        angosta && styles.columnaAngosta,
        centrado && styles.columnaCentrada,
        estiloContenido,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.raiz}>
      <Fondo />

      <SafeAreaView style={styles.segura} edges={["top", "bottom"]}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}

            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {columna}
          </ScrollView>
        ) : (
          <View style={styles.sinScroll}>{columna}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  raiz: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  segura: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.lg,
    paddingBottom: espacio.xxxl,
  },

  sinScroll: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.lg,
  },

  columna: {
    width: "100%",
    maxWidth: ANCHO_MAXIMO,
  },

  columnaAngosta: {
    maxWidth: ANCHO_FORMULARIO,
  },

  columnaCentrada: {
    flex: 1,
    justifyContent: "center",
  },
}));
