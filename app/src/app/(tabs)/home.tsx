import React, { useCallback, useState } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import MenuCard from "../../components/MenuCard";
import AvisoVerificacion from "../../components/AvisoVerificacion";
import { soyAdmin } from "../../lib/voitos";
import LavaBackground from "../../components/LavaBackground";

export default function Menu() {
  // El acceso al panel solo aparece si el backend confirma el rol. No es una
  // medida de seguridad: entrar a /admin a mano no sirve, porque todas esas
  // rutas responden 404 a quien no es admin. Es para no mostrarle a un cuidador
  // un boton que no le corresponde.
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      soyAdmin()
        .then((r) => {
          if (vigente) setAdmin(r.admin);
        })
        .catch(() => {
          if (vigente) setAdmin(false);
        });
      return () => {
        vigente = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>

      {/* Fondo animado */}
      <LavaBackground />

      {/* Contenido */}
      <View style={styles.content}>
       <Text style={styles.title}>
                 ME<Text style={styles.i}>N</Text>Ú
               </Text>

        <AvisoVerificacion />
       
        <MenuCard
          title="CALENDARIO"
          image={require("../../../assets/images/calendario.jpg")}
          onPress={() => router.push("/calendario")}
        />

        <MenuCard
          title="PASTILLAS"
          image={require("../../../assets/images/pastillas.jpg")}
          onPress={() => router.push("/medicacion")}
        />

        {admin && (
          <Pressable style={styles.admin} onPress={() => router.push("/admin")}>
            <Text style={styles.adminTexto}>ADMINISTRACIÓN</Text>
          </Pressable>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1, // Hace que el contenido quede por encima del fondo
    
  },
  i: {
    color: "#098B03",
  },

  // Discreto a proposito: es una herramienta interna, no una funcion mas de la
  // aplicacion.
  admin: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#105A2C",
  },

  adminTexto: {
    color: "#78877E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },


  title: {
    color: "white",
    fontSize: 45,
    fontWeight: "900",
    marginBottom: 40,
  },
});