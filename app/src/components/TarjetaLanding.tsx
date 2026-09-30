import React from "react";
import { Image, ImageBackground, Linking, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, espacio, radio, texto } from "../tema";

// La entrada a la landing, abajo de todo en el inicio.
//
// La landing NO es una pantalla de la app: es la pagina de presentacion que
// hizo el equipo, copiada tal cual en app/public/landing, con su propio HTML,
// sus animaciones y su JS. Expo la copia al build y se sirve en /landing/. Por
// eso se entra con una navegacion completa y no con router.push: el router no
// la conoce, y si la conociera la dibujaria adentro de la app y perderia todo.
//
// La foto y el logo salen de la misma landing, asi la tarjeta ya anticipa lo
// que se va a ver. Los nombres llevan el hash del build de Vite: si algun dia
// se vuelve a copiar la landing con otro build, hay que actualizarlos aca.
const LANDING = Platform.OS === "web" ? "/landing/" : "https://voitos.vercel.app/landing/";
const FOTO = `${LANDING}assets/voitos-hero-reference-WlMB5ciL.webp`;
const LOGO = `${LANDING}assets/logo-ORcyoWlb.png`;

const abrir = () => {
  if (Platform.OS === "web") window.location.assign(LANDING);
  else Linking.openURL(LANDING);
};

export default function TarjetaLanding() {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="link"
      accessibilityLabel="Conocé Voitos"
      accessibilityHint="Abre la página de presentación del pastillero"
      style={({ pressed }) => [styles.marco, pressed && styles.apretado]}
    >
      <ImageBackground source={{ uri: FOTO }} style={styles.foto} imageStyle={styles.fotoImagen}>
        {/* Oscurece la foto para que el texto se lea sobre cualquier parte. */}
        <View style={styles.velo} />

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
            <Ionicons name="arrow-forward" size={26} color={colores.acento} />
          </View>
        </View>
      </ImageBackground>
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

  apretado: {
    borderColor: colores.acento,
    opacity: 0.9,
  },

  // Mediana: mas alta que una tarjeta de dosis, sin llegar a ser un hero.
  foto: {
    minHeight: 190,
    justifyContent: "flex-end",
  },

  // La foto es horizontal y las caras estan arriba: se ancla ahi para que no
  // se corten al recortar a lo ancho del celular.
  fotoImagen: {
    resizeMode: "cover",
    objectPosition: "top",
  } as any,

  velo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
}));
