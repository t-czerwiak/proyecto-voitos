import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Fondo from "./Fondo";
import { ANCHO_FORMULARIO, ANCHO_MAXIMO, crearEstilos, espacio } from "../tema";

type Props = {
  children: React.ReactNode;
  // Sin scroll para las pantallas que entran enteras y no tienen que
  // moverse (la portada, por ejemplo).
  scroll?: boolean;
  // Centra el contenido verticalmente. Solo tiene sentido sin scroll.
  centrado?: boolean;
  // Columna mas angosta, para las pantallas de entrada. Ver ANCHO_FORMULARIO.
  angosta?: boolean;
  estiloContenido?: ViewStyle;
};

// El armazon de toda pantalla: fondo, margenes seguros y una sola columna de
// ancho limitado.
//
// El limite de ancho es para el navegador de escritorio. Sin el, una linea de
// texto cruzaba toda la pantalla y volver al principio del renglon siguiente
// se volvia un ejercicio de punteria.
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
            // Que el teclado no tape el campo que se esta completando ni se
            // cierre al tocar un boton de la misma pantalla.
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
