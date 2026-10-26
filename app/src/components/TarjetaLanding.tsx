import React from "react";
import { Image, ImageBackground, Linking, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, useMovimientoReducido, espacio, radio, texto } from "../tema";

const LANDING = Platform.OS === "web" ? "/landing/" : "https://voitos.vercel.app/landing/";
const FOTO = `${LANDING}assets/voitos-hero-reference-WlMB5ciL.webp`;
const LOGO = `${LANDING}assets/logo-ORcyoWlb.png`;

const abrir = () => {
  if (Platform.OS === "web") window.location.assign(LANDING);
  else Linking.openURL(LANDING);
};

type EstadoPress = { pressed: boolean; hovered?: boolean; focused?: boolean };

export default function TarjetaLanding() {
  const styles = useEstilos();
  const colores = useColores();
  const quieto = useMovimientoReducido();

  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="link"
      accessibilityLabel="Conocé Voitos"
      accessibilityHint="Abre la página de presentación del pastillero"
      style={(e) => {
        const { pressed, hovered, focused } = e as EstadoPress;
        const activa = hovered || pressed;
        return [
          styles.marco,
          !quieto && styles.conTransicion,
          activa && styles.marcoActivo,
          activa && !quieto && styles.marcoLevantado,
          pressed && !quieto && styles.marcoApretado,
          focused && styles.foco,
        ];
      }}
    >
      {(e) => {
        const { pressed, hovered } = e as EstadoPress;
        const activa = hovered || pressed;
        return (
          <ImageBackground
            source={{ uri: FOTO }}
            style={styles.foto}
            imageStyle={[
              styles.fotoImagen,
              !quieto && styles.conTransicion,
              activa && !quieto && styles.fotoCerca,
            ]}
          >
            <View style={[styles.velo, !quieto && styles.conTransicion, activa && styles.veloClaro]} />

            <View style={styles.contenido}>
              <Image
                source={{ uri: LOGO }}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />

              <View style={styles.fila}>
                <View style={styles.textos}>
                  <Text style={styles.titulo}>Conocé Voitos</Text>
                  <Text style={styles.bajada}>Qué es, cómo funciona y para quién es</Text>
                </View>
                <View style={[!quieto && styles.conTransicion, activa && !quieto && styles.flechaAdelante]}>
                  <Ionicons name="arrow-forward" size={26} color={colores.acento} />
                </View>
              </View>
            </View>
          </ImageBackground>
        );
      }}
    </Pressable>
  );
}

const useEstilos = crearEstilos((colores) => ({
  marco: {
    marginTop: espacio.xl,
    borderRadius: radio.xl,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    overflow: "hidden",
  },

  conTransicion: {
    transitionProperty: "transform, opacity, border-color, box-shadow, background-color",
    transitionDuration: "320ms",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  } as any,

  marcoActivo: {
    borderColor: colores.acento,
  },

  marcoLevantado: {
    transform: [{ translateY: -3 }],
    boxShadow: "0 14px 32px rgba(0, 255, 127, 0.18)",
  } as any,

  marcoApretado: {
    transform: [{ translateY: 0 }, { scale: 0.99 }],
    boxShadow: "0 4px 12px rgba(0, 255, 127, 0.12)",
  } as any,

  foco: {
    borderColor: colores.texto,
    boxShadow: `0 0 0 3px ${colores.acento}`,
  } as any,

  foto: {
    minHeight: 190,
    justifyContent: "flex-end",
  },

  fotoImagen: {
    bottom: "auto",
    height: "auto",
    aspectRatio: 1448 / 1086,
    transformOrigin: "top",
  } as any,

  fotoCerca: {
    transform: [{ scale: 1.05 }],
  },

  velo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },

  veloClaro: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },

  contenido: {
    padding: espacio.lg,
    gap: espacio.sm,
  },

  logo: {
    width: 110,
    height: 46,
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
  },

  textos: {
    flex: 1,
  },

  titulo: {
    ...texto.item,
    color: colores.texto,
  },

  bajada: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  flechaAdelante: {
    transform: [{ translateX: 6 }],
  },
}));
