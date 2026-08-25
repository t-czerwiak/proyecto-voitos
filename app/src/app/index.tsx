import React from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { Pantalla, Boton, BotonTema } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

// La portada.
//
// Antes era el logo, un boton con brillo verde y "Crear cuenta" en letra
// chica abajo. Se veia bien y no decia nada: quien abre la aplicacion por
// primera vez —el hijo al que le pasaron el pastillero, el enfermero del
// primer dia— no tenia forma de saber que es esto.
//
// Ahora dice en una linea para que sirve, y las dos salidas pesan lo mismo
// visualmente que su importancia: entrar es el boton lleno, crear cuenta es
// el de borde. Ninguna de las dos depende de pasar el mouse por encima.
export default function Portada() {
  const styles = useEstilos();

  return (
    <Pantalla scroll={false} centrado angosta>
      <BotonTema />

      <View style={styles.centro}>
        <Image
          source={require("../../assets/images/logoClaro.png")}
          style={styles.logo}
          resizeMode="contain"
          // El logo dice "Voitos"; para quien escucha la pantalla, eso es el
          // titulo de la portada.
          accessibilityRole="header"
          accessibilityLabel="Voitos"
        />

        <Text style={styles.bajada}>
          El pastillero entrega la medicación a horario. Vos la agendás desde
          acá y te enterás de cada dosis.
        </Text>
      </View>

      <View style={styles.acciones}>
        <Boton
          titulo="Iniciar sesión"
          icono="log-in-outline"
          onPress={() => router.push("/Login")}
        />

        <Boton
          titulo="Crear una cuenta"
          variante="secundario"
          icono="person-add-outline"
          onPress={() => router.push("/crear-cuenta")}
          ayuda="Si todavía no tenés cuenta, empezá por acá"
        />
      </View>
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  centro: {
    alignItems: "center",
    marginBottom: espacio.xxxl,
  },

  logo: {
    width: "100%",
    maxWidth: 320,
    height: 150,
  },

  bajada: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    textAlign: "center",
    marginTop: espacio.lg,
    maxWidth: 420,
  },

  acciones: {
    width: "100%",
    gap: espacio.md,
  },
}));
