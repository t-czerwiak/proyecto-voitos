import React, { useState } from "react";
import { router } from "expo-router";
import { registrarse } from "../../lib/voitos";
import BotonGoogle from "../../components/BotonGoogle";
import { Pantalla, Encabezado, Campo, Boton, Aviso, BotonTema } from "../../ui";

export default function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Los errores se muestran pegados al campo que los causo, no todos juntos
  // arriba: si la contrasena es corta, el aviso tiene que estar donde esta la
  // contrasena.
  const [errorPassword, setErrorPassword] = useState("");

  const handleCrearCuenta = async () => {
    setError("");
    setErrorPassword("");

    if (!nombre || !apellido || !mail || !password || !confirmacion) {
      setError("Completá todos los campos");
      return;
    }

    if (password !== confirmacion) {
      setErrorPassword("Las dos contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setErrorPassword("La contraseña tiene que tener al menos 6 caracteres");
      return;
    }

    setCargando(true);
    try {
      await registrarse({ nombre, apellido, mail, password });
      router.push("/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla angosta>
      <BotonTema />

      <Encabezado
        titulo="Crear una cuenta"
        bajada="La cuenta es de quien cuida. El pastillero se agenda desde acá."
        volverA="/"
      />

      <Aviso texto={error} />

      {/* Ver el comentario de Login: Google arriba, y sin contrasena.
          Con Google no hace falta elegir ninguna; si despues quiere una, el
          mail de bienvenida trae un enlace para ponerla. */}
      <BotonGoogle separador="abajo" leyenda="o con tu mail y una contraseña" />

      <Campo etiqueta="Nombre" valor={nombre} alCambiar={setNombre} autoCompletar="name" />

      <Campo etiqueta="Apellido" valor={apellido} alCambiar={setApellido} />

      <Campo
        etiqueta="Mail"
        valor={mail}
        alCambiar={setMail}
        teclado="email-address"
        autoCompletar="email"
        ayuda="Acá te van a llegar los avisos de cada dosis."
        placeholder="nombre@mail.com"
      />

      <Campo
        etiqueta="Contraseña"
        valor={password}
        alCambiar={setPassword}
        secreto
        autoCompletar="password-new"
        ayuda="Al menos 6 caracteres."
        error={errorPassword}
      />

      <Campo
        etiqueta="Repetí la contraseña"
        valor={confirmacion}
        alCambiar={setConfirmacion}
        secreto
        autoCompletar="password-new"
      />

      <Boton
        titulo={cargando ? "Creando la cuenta..." : "Crear la cuenta"}
        onPress={handleCrearCuenta}
        cargando={cargando}
      />
    </Pantalla>
  );
}
