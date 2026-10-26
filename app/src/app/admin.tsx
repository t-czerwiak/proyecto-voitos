import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
import { edadDesde } from "../lib/fechas";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Boton,
  Estado,
  Aviso,
  Cargando,
} from "../ui";
import { crearEstilos, useColores, espacio, texto } from "../tema";

export default function Admin() {
  const styles = useEstilos();
  const colores = useColores();

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
      "Eliminar cuenta",
      "peligro"
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
      "Vaciar",
      "peligro"
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
            <Tarjeta
              onPress={() => router.push("/admin-calendario")}
              etiqueta="Ver el calendario general"
              ayuda="Las dosis de todas las cuentas en una sola grilla"
            >
              <View style={styles.acceso}>
                <Ionicons name="calendar" size={26} color={colores.acento} />

                <View style={styles.accesoTextos}>
                  <Text style={styles.accesoTitulo}>Calendario general</Text>
                  <Text style={styles.accesoDetalle}>
                    Las dosis de todas las cuentas en una sola grilla
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={22} color={colores.textoTenue} />
              </View>
            </Tarjeta>

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

                  {edadDesde(u.fecha_nacimiento) !== null && (
                    <Estado
                      texto={`${edadDesde(u.fecha_nacimiento)} años`}
                      tono="neutro"
                      icono="person-outline"
                    />
                  )}
                </View>

                {u.listaPastillas && u.listaPastillas.length > 0 && (
                  <Text style={styles.pastillasDe}>
                    {u.listaPastillas.map((p) => p.nombre).join(" · ")}
                  </Text>
                )}

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

const useEstilos = crearEstilos((colores) => ({
  pastillasDe: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.sm,
  },

  acceso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
  },

  accesoTextos: {
    flex: 1,
  },

  accesoTitulo: {
    ...texto.item,
    color: colores.texto,
  },

  accesoDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: 2,
  },

  resumen: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginBottom: espacio.lg,
    marginTop: espacio.lg,
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
}));
