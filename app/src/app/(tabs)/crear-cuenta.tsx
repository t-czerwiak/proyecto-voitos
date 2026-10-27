import React, { useState } from "react";
import { router } from "expo-router";
import { registrarse, destinoAlEntrar } from "../../lib/voitos";
import BotonGoogle from "../../components/BotonGoogle";
import { Pantalla, Encabezado, Campo, CampoFechaNacimiento, Boton, Aviso } from "../../ui";

export default function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

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
      await registrarse({
        nombre,
        apellido,
        mail,
        password,

        ...(fechaNacimiento ? { fecha_nacimiento: fechaNacimiento } : {}),
      });
      router.push(await destinoAlEntrar());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla angosta presentacion>
      <Encabezado
        titulo="Crear una cuenta"
        bajada="La cuenta es de quien cuida. El pastillero se agenda desde acá."
        volverA="/"
      />

      <Aviso texto={error} />

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

      <CampoFechaNacimiento
        valor={fechaNacimiento}
        alCambiar={setFechaNacimiento}
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
