import React from "react";
import { Image, ScrollView, Text, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Fondo from "./Fondo";
import BarraEscritorio from "./BarraEscritorio";
import { useEscritorio } from "./Columnas";
import { getUsuarioActual } from "../lib/voitos";
import {
  ANCHO_ESCRITORIO_MAXIMO,
  ANCHO_FORMULARIO,
  ANCHO_HOJA,
  ANCHO_MAXIMO,
  crearEstilos,
  espacio,
  radio,
  texto,
} from "../tema";

type Props = {
  children: React.ReactNode;

  scroll?: boolean;

  centrado?: boolean;

  angosta?: boolean;

  ancha?: boolean;

  presentacion?: boolean;

  formulario?: boolean;
  estiloContenido?: ViewStyle;
};

export default function Pantalla({
  children,
  scroll = true,
  centrado = false,
  angosta = false,
  ancha = false,
  presentacion = false,
  formulario = false,
  estiloContenido,
}: Props) {
  const styles = useEstilos();
  const escritorio = useEscritorio();

  if (escritorio && presentacion) {
    return (
      <View style={[styles.raiz, styles.partida]}>
        <View style={styles.foto}>
          <Image
            source={require("../../assets/images/portada.webp")}
            style={styles.fotoImagen}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={["transparent", "rgba(1,13,7,0.55)", "rgba(1,13,7,0.95)"]}
            locations={[0.35, 0.65, 1]}
            style={styles.fotoVelo}
          />
          <View style={styles.fotoTextos}>
            <Image
              source={require("../../assets/images/logoClaro.png")}
              style={styles.fotoLogo}
              resizeMode="contain"
              accessibilityLabel="Voitos"
            />
            <Text style={styles.fotoFrase}>
              El pastillero entrega cada dosis a su hora. Vos la agendás desde acá y te enterás cuando sale.
            </Text>
          </View>
        </View>

        <View style={styles.lado}>
          <Fondo />
          <ScrollView
            contentContainerStyle={styles.ladoScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.columna, styles.columnaAngosta, estiloContenido]}>{children}</View>
          </ScrollView>
        </View>
      </View>
    );
  }

  const conBarra = escritorio && !presentacion && getUsuarioActual() !== null;

  const columna = (
    <View
      style={[
        styles.columna,
        escritorio
          ? formulario
            ? [styles.columnaHoja, styles.hoja]
            : styles.columnaAncha
          : [angosta && styles.columnaAngosta, ancha && styles.columnaAncha],
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
        {conBarra && <BarraEscritorio />}

        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scroll, escritorio && styles.scrollEscritorio]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {columna}
          </ScrollView>
        ) : (
          <View style={[styles.sinScroll, escritorio && styles.scrollEscritorio]}>{columna}</View>
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

  scrollEscritorio: {
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.xxl,
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

  columnaAncha: {
    maxWidth: ANCHO_ESCRITORIO_MAXIMO,
  },

  columnaHoja: {
    maxWidth: ANCHO_HOJA,
  },

  hoja: {
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.xl,
    paddingHorizontal: espacio.xxxl,
    paddingTop: espacio.xl,
    paddingBottom: espacio.xxl,
  },

  columnaCentrada: {
    flex: 1,
    justifyContent: "center",
  },

  partida: {
    flexDirection: "row",
  },

  foto: {
    flex: 11,
    overflow: "hidden",
  },

  fotoImagen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  fotoVelo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  fotoTextos: {
    position: "absolute",
    left: espacio.xxxl,
    right: espacio.xxxl,
    bottom: espacio.xxxl,
    maxWidth: 520,
  },

  fotoLogo: {
    width: 220,
    height: 80,
    marginBottom: espacio.lg,
  },

  fotoFrase: {
    ...texto.seccion,
    fontSize: 24,
    lineHeight: 34,
    color: colores.texto,
  },

  lado: {
    flex: 9,
    borderLeftWidth: 1,
    borderLeftColor: colores.borde,
  },

  ladoScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacio.xxl,
    paddingVertical: espacio.xxxl,
  },
}));
