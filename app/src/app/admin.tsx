// Panel de administracion.
//
// No hay link visible salvo para los administradores: el inicio lo muestra
// solo si el backend confirma el rol. Igual, entrar escribiendo /admin a mano
// no sirve de nada, porque todas las rutas del backend responden 404 a quien
// no es admin. La app decide que mostrar; la seguridad la pone el servidor.

import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getUsuariosAdmin,
  verificarUsuario,
  desverificarUsuario,
  vaciarCalendarioDe,
  borrarUsuario,
  soyAdmin,
  UsuarioAdmin,
} from "../lib/voitos";
import { confirmar } from "../lib/avisos";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Boton,
  Estado,
  Aviso,
  Cargando,
} from "../ui";
import { colores, espacio, texto } from "../tema";

export default function Admin() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");
  const [yo, setYo] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const { admin, id } = await soyAdmin();
      setYo(id);
      if (!admin) {
        setError("Esta pantalla es solo para administradores.");
        setCargando(false);
        return;
      }
      setUsuarios(await getUsuariosAdmin());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const cambiarVerificacion = async (u: UsuarioAdmin) => {
    setAviso("");
    setOcupado(u.id);
    try {
      if (u.verificado) {
        await desverificarUsuario(u.id);
        setAviso(`${u.mail} quedó sin verificar`);
      } else {
        await verificarUsuario(u.id);
        setAviso(`${u.mail} quedó verificada`);
      }
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado("");
    }
  };

  const borrarCuenta = async (u: UsuarioAdmin) => {
    const seguir = await confirmar(
      `Eliminar la cuenta de ${u.nombre}`,
      `Se borra ${u.mail} con TODO lo suyo: ${u.pastillas} ` +
        `${u.pastillas === 1 ? "pastilla" : "pastillas"}, sus dosis, su historial ` +
        `de dispensaciones, sus contactos y sus actividades.\n\n` +
        `Los módulos del pastillero quedan, vacíos.\n\n` +
        `Esto no se puede deshacer. ¿Seguro?`,
      "Eliminar cuenta"
    );
    if (!seguir) return;

    setAviso("");
    setOcupado(u.id);
    try {
      const r = await borrarUsuario(u.id);
      setAviso(`Se eliminó ${r.mail} y todo lo suyo`);
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado("");
    }
  };

  const borrarCalendario = async (u: UsuarioAdmin) => {
    const seguir = await confirmar(
      `Vaciar el calendario de ${u.nombre}`,
      `Se borran las dosis que todavía no salieron de ${u.mail}.\n\n` +
        `Las ya dispensadas quedan en el historial.\n\n¿Seguro?`,
      "Vaciar"
    );
    if (!seguir) return;

    setAviso("");
    setOcupado(u.id);
    try {
      const r = await vaciarCalendarioDe(u.id);
      setAviso(
        r.borradas === 0
          ? `${u.nombre} no tenía dosis pendientes`
          : `Se borraron ${r.borradas} dosis de ${u.nombre}`
      );
      await cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado("");
    }
  };

  return (
    <Pantalla>
      <Encabezado
        titulo="Administración"
        bajada="Las cuentas del sistema. Herramienta interna."
        volverA="/home"
      />

      <Aviso texto={error} />
      <Aviso texto={aviso} tipo="ok" titulo="Hecho" />

      {cargando ? (
        <Cargando texto="Buscando las cuentas..." />
      ) : (
        !error && (
          <>
            <Text style={styles.resumen}>
              {usuarios.length} {usuarios.length === 1 ? "cuenta" : "cuentas"}
            </Text>

            {usuarios.map((u) => (
              <Tarjeta key={u.id}>
                <View style={styles.titulo}>
                  <Text style={styles.nombre}>
                    {u.nombre} {u.apellido}
                  </Text>

                  {u.rol === "admin" && (
                    <Estado texto="Admin" tono="ok" icono="shield-checkmark" />
                  )}
                </View>

                <Text style={styles.mail}>{u.mail}</Text>

                <View style={styles.estados}>
                  {/* Icono, palabra y color juntos. Antes era un punto de
                      color al lado del texto: para quien no distingue el
                      verde del ámbar, dos cuentas idénticas. */}
                  <Estado
                    texto={u.verificado ? "Verificada" : "Sin verificar"}
                    tono={u.verificado ? "ok" : "atencion"}
                  />

                  <Estado
                    texto={`${u.pastillas} ${u.pastillas === 1 ? "pastilla" : "pastillas"}`}
                    tono="neutro"
                    icono="medkit-outline"
                  />

                  <Estado
                    texto={`${u.horarios} ${u.horarios === 1 ? "dosis" : "dosis"}`}
                    tono="neutro"
                    icono="time-outline"
                  />
                </View>

                <View style={styles.acciones}>
                  <Boton
                    titulo={u.verificado ? "Quitar la verificación" : "Verificar la cuenta"}
                    variante="secundario"
                    onPress={() => cambiarVerificacion(u)}
                    deshabilitado={ocupado === u.id}
                  />

                  <Boton
                    titulo="Vaciar el calendario"
                    variante="peligro"
                    icono="calendar-clear-outline"
                    onPress={() => borrarCalendario(u)}
                    deshabilitado={ocupado === u.id || u.horarios === 0}
                    ayuda="Borra las dosis que todavía no salieron"
                  />

                  {/* El admin no puede borrarse a si mismo: quedaria sin cuenta
                      y sin panel, sin forma de deshacerlo desde la aplicacion.
                      El backend tambien lo rechaza, esto es solo para no
                      ofrecerlo. */}
                  {u.id !== yo && (
                    <Boton
                      titulo="Eliminar la cuenta"
                      variante="peligro"
                      icono="trash-outline"
                      onPress={() => borrarCuenta(u)}
                      deshabilitado={ocupado === u.id}
                      ayuda="Borra la cuenta y todo lo suyo. No se puede deshacer"
                    />
                  )}
                </View>
              </Tarjeta>
            ))}
          </>
        )
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  resumen: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginBottom: espacio.lg,
  },

  titulo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espacio.md,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
  },

  mail: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.xs,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.md,
  },

  acciones: {
    gap: espacio.sm,
    marginTop: espacio.lg,
  },
});
