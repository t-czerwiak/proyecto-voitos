import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  cerrarSesion,
  borrarMiCuenta,
  getPastillas,
  getHorariosDelUsuario,
  type Pastilla,
  type Horario,
} from "../lib/voitos";

import type { Usuario } from "../lib/api";
import { proximaDosis } from "../lib/dosis";
import { comoHora, fechaRelativa } from "../lib/fechas";
import { confirmar } from "../lib/avisos";
import Avatar from "../components/Avatar";
import TusDatos from "../components/TusDatos";
import IconoPastilla from "../components/IconoPastilla";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Boton,
  Aviso,
  Estado,
  Vacio,
  Cargando,
  Columnas,
  useEscritorio,
} from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

export default function Perfil() {
  const styles = useEstilos();
  const escritorio = useEscritorio();

  const [usuario, setUsuario] = useState<Usuario | null>(getUsuarioActual());
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(false);


  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      refrescarUsuario()
        .then((u) => vigente && u && setUsuario(u))
        .catch(() => {});

      Promise.all([getPastillas(), getHorariosDelUsuario()])
        .then(([p, h]) => {
          if (!vigente) return;
          setPastillas(p);
          setHorarios(h);
          setError("");
        })
        .catch((e: any) => {
          if (!vigente) return;
          setError(e?.message ?? "No se pudieron cargar tus datos");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  const proximaPorPastilla = useMemo(() => {
    const mapa = new Map<string, Horario | null>();
    for (const p of pastillas) {
      mapa.set(p.id, proximaDosis(horarios.filter((h) => h.pastilla_id === p.id)));
    }
    return mapa;
  }, [pastillas, horarios]);

  const proximaGeneral = useMemo(() => proximaDosis(horarios), [horarios]);

  const salir = async () => {
    const seguro = await confirmar(
      "Cerrar sesión",
      usuario?.mail
        ? `Vas a salir de la cuenta ${usuario.mail}. Para volver a entrar vas a tener que iniciar sesión de nuevo.`
        : "Para volver a entrar vas a tener que iniciar sesión de nuevo.",
      "Cerrar sesión"
    );
    if (!seguro) return;

    cerrarSesion();

    router.replace("/");
  };

  const borrarCuenta = async () => {
    const seguro = await confirmar(
      "Borrar tu cuenta",
      `Se borra ${usuario?.mail ?? "tu cuenta"} con TODO lo tuyo: ` +
        `${pastillas.length} ${pastillas.length === 1 ? "pastilla" : "pastillas"}, ` +
        `sus dosis, tu historial de dispensaciones, tus contactos y tus actividades.\n\n` +
        `El pastillero deja de dispensarte.\n\n` +
        `Esto no se puede deshacer y no hay forma de recuperarlo. ¿Seguro?`,
      "Borrar mi cuenta",
      "peligro"
    );
    if (!seguro) return;

    setBorrando(true);
    setError("");
    try {
      await borrarMiCuenta();
      cerrarSesion();
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo borrar la cuenta");
      setBorrando(false);
    }
  };

  return (
    <Pantalla angosta={!escritorio} ancha={escritorio}>
      <Encabezado titulo="Tu perfil" volverA="/home" principal />

      <Aviso texto={error} />

      <View style={styles.identidad}>
        <Avatar usuario={usuario} />

        <View style={styles.identidadTextos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : "Tu cuenta"}
          </Text>
          <Text style={styles.mail} numberOfLines={1} selectable>
            {usuario?.mail ?? "—"}
          </Text>
        </View>
      </View>

      <Columnas
        principal={
          <>
            {proximaGeneral && escritorio && (
              <Text style={[styles.seccion, styles.seccionPrimera]}>Lo próximo</Text>
            )}

            {proximaGeneral && (
              <Tarjeta destacada etiqueta="Lo próximo">
                <Text style={styles.proxima}>
                  {comoHora(proximaGeneral.hora, proximaGeneral.minuto)}
                </Text>
                <Text style={styles.proximaDetalle}>
                  {proximaGeneral.pastillas?.nombre ?? "Una dosis"} ·{" "}
                  {fechaRelativa(proximaGeneral.dia)}
                </Text>
              </Tarjeta>
            )}

            <Text style={styles.seccion}>Tus pastillas</Text>

            {cargando ? (
              <Cargando texto="Buscando tus pastillas..." />
            ) : pastillas.length === 0 ? (
              <Vacio
                titulo="Todavía no cargaste ninguna"
                detalle="Cuando agregues una pastilla, acá vas a ver su estado y cuándo le toca."
                accion={{
                  titulo: "Agregar una pastilla",
                  onPress: () => router.push("/agregar-medicacion"),
                }}
              />
            ) : (
              <View style={escritorio ? styles.grilla : undefined}>
                {pastillas.map((p) => {
                  const proxima = proximaPorPastilla.get(p.id) ?? null;
                  const quedan = p.modulo?.cantidad_actual ?? null;

                  return (
                    <View key={p.id} style={escritorio ? styles.grillaItem : undefined}>
                      <Tarjeta>
                        <View style={styles.pastillaFila}>
                          <IconoPastilla tipo={p.tipo} tam={34} />
                          <Text style={styles.pastilla}>{p.nombre}</Text>
                        </View>

                        <View style={styles.estados}>
                          {proxima ? (
                            <Estado
                              texto={`${comoHora(proxima.hora, proxima.minuto)} · ${fechaRelativa(proxima.dia)}`}
                              tono="ok"
                              icono="time-outline"
                            />
                          ) : (
                            <Estado texto="Sin dosis agendadas" tono="neutro" icono="time-outline" />
                          )}

                          {quedan !== null && (
                            <Estado
                              texto={`Quedan ${quedan}`}
                              tono={quedan === 0 ? "atencion" : "neutro"}
                              icono="medkit-outline"
                            />
                          )}
                        </View>
                      </Tarjeta>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        }
        lateral={
          <>
            <Text style={[styles.seccion, escritorio && styles.seccionPrimera]}>Tu pastillero</Text>

            <Boton
              titulo="Mi pastillero"
              variante="secundario"
              icono="hardware-chip-outline"
              onPress={() => router.push("/mi-pastillero")}
              ayuda="Vincularlo a tu cuenta con el código de su pantalla"
            />

            <Text style={styles.seccion}>Tus datos</Text>

            <TusDatos usuario={usuario} alCambiar={setUsuario} />

            <Text style={styles.seccion}>Tu cuenta</Text>

            <View style={styles.salidas}>
              <Boton
                titulo="Cerrar sesión"
                variante="secundario"
                icono="log-out-outline"
                onPress={salir}
                ayuda="Vas a tener que iniciar sesión de nuevo para volver"
              />

              <Boton
                titulo="Borrar mi cuenta"
                variante="peligro"
                icono="trash-outline"
                onPress={borrarCuenta}
                cargando={borrando}
                ayuda="Se borra todo lo tuyo y no se puede deshacer"
              />
            </View>
          </>
        }
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  identidad: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
    marginBottom: espacio.lg,
  },

  identidadTextos: {
    flex: 1,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
  },

  mail: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  proxima: {
    ...texto.hora,
    color: colores.acento,
  },

  proximaDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  seccion: {
    ...texto.seccion,
    color: colores.texto,
    marginTop: espacio.xl,
    marginBottom: espacio.sm,
  },

  pastillaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
    marginBottom: espacio.sm,
  },

  pastilla: {
    ...texto.item,
    color: colores.texto,
    flexShrink: 1,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
  },

  seccionPrimera: {
    marginTop: 0,
  },

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  grillaItem: {
    width: "48.5%",
  },

  salidas: {
    gap: espacio.md,
    marginBottom: espacio.xl,
  },
}));
