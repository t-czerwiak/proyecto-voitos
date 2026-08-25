import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { pedirRecuperacion, confirmarRecuperacion } from "../lib/voitos";
import { Pantalla, Encabezado, Campo, Boton, Aviso } from "../ui";

// Recuperacion de contrasena. Las dos mitades del flujo segun haya token en
// la URL o no:
//
//   /recuperar               -> pide el mail y manda el enlace
//   /recuperar?token=abc123  -> pide la contrasena nueva
export default function Recuperar() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const hayToken = Boolean(token);

  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [errorPassword, setErrorPassword] = useState("");
  const [aviso, setAviso] = useState("");

  const pedirEnlace = async () => {
    setError("");
    setAviso("");

    if (!mail.trim()) {
      setError("Escribí tu mail");
      return;
    }

    setCargando(true);
    try {
      const r = await pedirRecuperacion(mail);
      // El backend contesta lo mismo exista o no la cuenta, para no delatar
      // que casillas estan registradas. La pantalla dice lo mismo.
      setAviso(r.mensaje);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const guardarPassword = async () => {
    setError("");
    setErrorPassword("");

    if (password.length < 6) {
      setErrorPassword("La contraseña tiene que tener al menos 6 caracteres");
      return;
    }

    // Se pide dos veces porque no hay forma de deshacerlo: si se equivoca al
    // tipear queda afuera de su cuenta y hay que empezar todo de nuevo.
    if (password !== repetida) {
      setErrorPassword("Las dos contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      await confirmarRecuperacion(String(token), password);
      router.replace("/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla angosta>
      <Encabezado
        titulo={hayToken ? "Elegí tu contraseña" : "Recuperar la contraseña"}
        bajada={
          hayToken
            ? "Escribila dos veces para asegurarnos de que no haya un error de tipeo."
            : "Escribí tu mail y te mandamos un enlace para elegir una nueva."
        }
        volverA={hayToken ? "/" : "/Login"}
      />

      <Aviso texto={error} />
      <Aviso texto={aviso} tipo="ok" titulo="Mail enviado" />

      {hayToken ? (
        <>
          <Campo
            etiqueta="Contraseña nueva"
            valor={password}
            alCambiar={setPassword}
            secreto
            autoCompletar="password-new"
            ayuda="Al menos 6 caracteres."
            error={errorPassword}
          />

          <Campo
            etiqueta="Repetila"
            valor={repetida}
            alCambiar={setRepetida}
            secreto
            autoCompletar="password-new"
          />

          <Boton
            titulo={cargando ? "Guardando..." : "Guardar la contraseña"}
            onPress={guardarPassword}
            cargando={cargando}
          />
        </>
      ) : (
        <>
          <Campo
            etiqueta="Mail"
            valor={mail}
            alCambiar={setMail}
            teclado="email-address"
            autoCompletar="email"
            placeholder="nombre@mail.com"
          />

          <Boton
            titulo={cargando ? "Enviando..." : "Mandarme el enlace"}
            onPress={pedirEnlace}
            cargando={cargando}
          />

          <Boton
            titulo="Volver a entrar"
            variante="enlace"
            onPress={() => router.push("/Login")}
          />
        </>
      )}
    </Pantalla>
  );
}
