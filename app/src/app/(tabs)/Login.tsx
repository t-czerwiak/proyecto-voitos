import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { iniciarSesion } from "../../lib/voitos";
import BotonGoogle from "../../components/BotonGoogle";
import { Pantalla, Encabezado, Campo, Boton, Aviso } from "../../ui";
import { espacio } from "../../tema";

export default function Login() {
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleIniciarSesion = async () => {
    setError("");

    if (!mail || !password) {
      setError("Completá el mail y la contraseña");
      return;
    }

    setCargando(true);
    try {
      await iniciarSesion(mail, password);
      router.push("/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla>
      <Encabezado
        titulo="Entrar a tu cuenta"
        bajada="Con el mail y la contraseña con los que te registraste."
        volverA="/"
      />

      <Aviso texto={error} />

      <Campo
        etiqueta="Mail"
        valor={mail}
        alCambiar={setMail}
        teclado="email-address"
        autoCompletar="email"
        placeholder="nombre@mail.com"
      />

      <Campo
        etiqueta="Contraseña"
        valor={password}
        alCambiar={setPassword}
        secreto
        autoCompletar="password"
      />

      <Boton
        titulo={cargando ? "Entrando..." : "Entrar"}
        onPress={handleIniciarSesion}
        cargando={cargando}
      />

      <View style={styles.secundarias}>
        <Boton
          titulo="Olvidé mi contraseña"
          variante="enlace"
          onPress={() => router.push("/recuperar")}
          ayuda="Te mandamos un mail para elegir una nueva"
        />

        <Boton
          titulo="Crear una cuenta"
          variante="enlace"
          onPress={() => router.push("/crear-cuenta")}
        />
      </View>

      <BotonGoogle />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  secundarias: {
    marginTop: espacio.md,
    marginBottom: espacio.lg,
    gap: espacio.xs,
  },
});
