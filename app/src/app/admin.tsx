// Panel de administracion.
//
// No hay link visible salvo para los administradores: el menu lo muestra solo
// si el backend confirma el rol. Igual, entrar escribiendo /admin a mano no
// sirve de nada, porque todas las rutas del backend responden 404 a quien no
// es admin. La app decide que mostrar; la seguridad la pone el servidor.

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
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
        `de dispensaciones, sus contactos y sus actividades.

` +
        `Los módulos del pastillero quedan, vacíos.

` +
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Pressable onPress={() => router.push("/home")}>
          <Text style={styles.titulo}>ADMINISTRACIÓN</Text>
        </Pressable>

        {cargando && <ActivityIndicator color="#00FF7F" style={{ marginTop: 30 }} />}

        {error !== "" && <Text style={styles.error}>{error}</Text>}
        {aviso !== "" && <Text style={styles.aviso}>{aviso}</Text>}

        {!cargando && !error && (
          <Text style={styles.resumen}>
            {usuarios.length} {usuarios.length === 1 ? "cuenta" : "cuentas"}
          </Text>
        )}

        {usuarios.map((u) => (
          <View key={u.id} style={styles.tarjeta}>
            <View style={styles.filaTitulo}>
              <Text style={styles.nombre}>
                {u.nombre} {u.apellido}
              </Text>

              {u.rol === "admin" && (
                <View style={styles.etiquetaAdmin}>
                  <Text style={styles.etiquetaAdminTexto}>ADMIN</Text>
                </View>
              )}
            </View>

            <Text style={styles.mail}>{u.mail}</Text>

            <View style={styles.estado}>
              <View
                style={[
                  styles.punto,
                  { backgroundColor: u.verificado ? "#00FF7F" : "#E0A82E" },
                ]}
              />
              <Text style={styles.estadoTexto}>
                {u.verificado ? "Cuenta verificada" : "Sin verificar"}
              </Text>
            </View>

            <Text style={styles.datos}>
              {u.pastillas} {u.pastillas === 1 ? "pastilla" : "pastillas"} ·{" "}
              {u.horarios} {u.horarios === 1 ? "dosis" : "dosis"}
            </Text>

            <View style={styles.acciones}>
              <Pressable
                style={[styles.boton, u.verificado && styles.botonSuave]}
                onPress={() => cambiarVerificacion(u)}
                disabled={ocupado === u.id}
              >
                <Text style={styles.botonTexto}>
                  {u.verificado ? "DESVERIFICAR" : "VERIFICAR"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.boton, styles.botonPeligro]}
                onPress={() => borrarCalendario(u)}
                disabled={ocupado === u.id || u.horarios === 0}
              >
                <Text style={styles.botonTexto}>VACIAR CALENDARIO</Text>
              </Pressable>

              {/* El admin no puede borrarse a si mismo: quedaria sin cuenta y
                  sin panel, sin forma de deshacerlo desde la aplicacion. El
                  backend tambien lo rechaza, esto es solo para no ofrecerlo. */}
              {u.id !== yo && (
                <Pressable
                  style={[styles.boton, styles.botonPeligro]}
                  onPress={() => borrarCuenta(u)}
                  disabled={ocupado === u.id}
                >
                  <Text style={styles.botonTexto}>ELIMINAR CUENTA</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  contenido: {
    padding: 22,
    paddingBottom: 60,
  },

  titulo: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },

  resumen: {
    color: "#78877E",
    fontSize: 13,
    marginBottom: 18,
  },

  error: {
    color: "#FF8080",
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },

  aviso: {
    color: "#00FF7F",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },

  tarjeta: {
    backgroundColor: "#01250E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#105A2C",
    padding: 16,
    marginBottom: 14,
  },

  filaTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  nombre: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
  },

  etiquetaAdmin: {
    backgroundColor: "#0B5A19",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  etiquetaAdminTexto: {
    color: "#9FFFC4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  mail: {
    color: "#78877E",
    fontSize: 13,
    marginTop: 2,
  },

  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },

  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  estadoTexto: {
    color: "#C8D6CD",
    fontSize: 13,
  },

  datos: {
    color: "#78877E",
    fontSize: 12,
    marginTop: 6,
  },

  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  boton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0B5A19",
    borderWidth: 1,
    borderColor: "#00FF7F",
  },

  botonSuave: {
    backgroundColor: "#01250E",
    borderColor: "#105A2C",
  },

  botonPeligro: {
    backgroundColor: "#2a0d0d",
    borderColor: "#7a1f1f",
  },

  botonTexto: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
