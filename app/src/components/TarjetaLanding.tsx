import React from "react";
import { Image, ImageBackground, Linking, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, useMovimientoReducido, espacio, radio, texto } from "../tema";

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

// Pressable expone hovered y focused en web, pero los tipos de React Native
// solo declaran pressed. Mismo arreglo que en ui/Boton.tsx.
type EstadoPress = { pressed: boolean; hovered?: boolean; focused?: boolean };

// EL HOVER, Y POR QUE ES ASI.
//
// Sigue el lenguaje del resto de la app: el borde pasa al verde de la marca,
// que es lo que hacen los botones y las tarjetas al pasar el mouse. Encima de
// eso, como es la unica tarjeta con foto, la foto se acerca apenas y se aclara,
// la flecha avanza y la tarjeta se levanta con un brillo verde. Ese brillo es
// el mismo que usa la landing en sus propios hovers, asi la tarjeta ya se
// siente parte de lo que abre.
//
// Con "movimiento reducido" no se mueve nada: solo cambian los colores. Y con
// teclado aparece el anillo de foco de los botones, que sin hover es la unica
// forma de saber donde se esta parado.
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
            {/* Oscurece la foto para que el texto se lea sobre cualquier parte.
                Al pasar el mouse se aclara: la foto "se prende". */}
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

  // Un solo juego de tiempos para todo lo que se mueve, asi el borde, la foto
  // y la flecha arrancan y terminan juntos.
  conTransicion: {
    transitionProperty: "transform, opacity, border-color, box-shadow, background-color",
    transitionDuration: "320ms",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  } as any,

  // El verde de la marca: lo mismo que hacen los botones al pasar el mouse.
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

  // El anillo de foco de ui/Boton.tsx: nitido y por fuera del borde.
  foco: {
    borderColor: colores.texto,
    boxShadow: `0 0 0 3px ${colores.acento}`,
  } as any,

  // Mediana: mas alta que una tarjeta de dosis, sin llegar a ser un hero.
  foto: {
    minHeight: 190,
    justifyContent: "flex-end",
  },

  // LA FOTO VA PEGADA ARRIBA, CON SU PROPIA PROPORCION.
  //
  // react-native-web la dibuja como fondo CSS centrado y no deja cambiar esa
  // posicion (objectPosition no hace nada). En escritorio la tarjeta es ancha y
  // baja, asi que la foto se escalaba por el ancho, se centraba y perdia la
  // parte de arriba: justo donde estan las caras.
  //
  // Ahora el contenedor de la foto tiene la misma proporcion que la foto (4:3),
  // arranca arriba de todo y la tarjeta recorta lo que sobra abajo. Desde 320px
  // de ancho la foto mide mas de 190px de alto, asi que siempre cubre la
  // tarjeta entera.
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
