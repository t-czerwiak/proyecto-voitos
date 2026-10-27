import React from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { Pantalla, Boton, useEscritorio } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

export default function Portada() {
  const styles = useEstilos();
  const escritorio = useEscritorio();

  return (
    <Pantalla scroll={false} centrado angosta presentacion>
      {escritorio ? (
        <View style={styles.cabecera}>
          <Text style={styles.titulo} accessibilityRole="header">
            Entrar a Voitos
          </Text>
          <Text style={styles.bajadaIzquierda}>
            Si ya tenés cuenta, iniciá sesión. Si no, creala en un minuto.
          </Text>
        </View>
      ) : (
        <View style={styles.centro}>
          <Image
            source={require("../../assets/images/logoClaro.png")}
            style={styles.logo}
            resizeMode="contain"

            accessibilityRole="header"
            accessibilityLabel="Voitos"
          />

          <Text style={styles.bajada}>
            El pastillero entrega la medicación a horario. Vos la agendás desde
            acá y te enterás de cada dosis.
          </Text>
        </View>
      )}

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

  cabecera: {
    marginBottom: espacio.xl,
  },

  titulo: {
    ...texto.titulo,
    color: colores.texto,
  },

  bajadaIzquierda: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },

  acciones: {
    width: "100%",
    gap: espacio.md,
  },
}));
