import React, { useCallback, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
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
import Avatar from "../components/Avatar";
import { Pantalla, Encabezado, Tarjeta, Boton, Estado, Aviso, Cargando, Vacio, useEscritorio } from "../ui";
import { crearEstilos, useColores, espacio, radio, texto } from "../tema";

export default function Admin() {
  const styles = useEstilos();
  const colores = useColores();
  const escritorio = useEscritorio();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");
  const [yo, setYo] = useState("");
  const [busqueda, setBusqueda] = useState("");

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

  const totales = useMemo(
    () => ({
      cuentas: usuarios.length,
      verificadas: usuarios.filter((u) => u.verificado).length,
      pastillas: usuarios.reduce((n, u) => n + u.pastillas, 0),
      dosis: usuarios.reduce((n, u) => n + u.horarios, 0),
    }),
    [usuarios]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => `${u.nombre} ${u.apellido} ${u.mail}`.toLowerCase().includes(q));
  }, [usuarios, busqueda]);

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

  const cifra = (valor: number, etiqueta: string, detalle?: string) => (
    <View style={[styles.cifra, escritorio && styles.cifraAncha]}>
      <Text style={styles.cifraValor}>{valor}</Text>
      <Text style={styles.cifraEtiqueta}>{etiqueta}</Text>
      {detalle && <Text style={styles.cifraDetalle}>{detalle}</Text>}
    </View>
  );

  return (
    <Pantalla>
      <View style={escritorio ? styles.cabecera : undefined}>
        <View style={styles.cabeceraTextos}>
          <Encabezado titulo="Administración" volverA="/home" principal />
        </View>
        <Boton
          titulo="Calendario general"
          variante="secundario"
          icono="calendar-outline"
          ancho={escritorio ? "auto" : "completo"}
          onPress={() => router.push("/admin-calendario")}
          ayuda="Las dosis de todas las cuentas en una sola grilla"
        />
      </View>

      <Aviso texto={error} />
      <Aviso texto={aviso} tipo="ok" titulo="Hecho" />

      {cargando ? (
        <Cargando texto="Buscando las cuentas..." />
      ) : (
        !error && (
          <>
            <View style={styles.cifras}>
              {cifra(totales.cuentas, totales.cuentas === 1 ? "cuenta" : "cuentas")}
              {cifra(
                totales.verificadas,
                "verificadas",
                totales.cuentas - totales.verificadas > 0
                  ? `${totales.cuentas - totales.verificadas} sin verificar`
                  : undefined
              )}
              {cifra(totales.pastillas, "pastillas")}
              {cifra(totales.dosis, "dosis agendadas")}
            </View>

            <View style={styles.buscador}>
              <Ionicons name="search" size={20} color={colores.textoTenue} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o mail"
                placeholderTextColor={colores.textoTenue}
                style={styles.buscadorCampo}
                accessibilityLabel="Buscar cuentas por nombre o mail"
                autoCapitalize="none"
              />
            </View>

            {visibles.length === 0 ? (
              <Vacio icono="search-outline" titulo="Ninguna cuenta coincide" />
            ) : (
              <View style={escritorio ? styles.grilla : undefined}>
                {visibles.map((u) => {
                  const edad = edadDesde(u.fecha_nacimiento);
                  return (
                    <View key={u.id} style={escritorio ? styles.grillaItem : undefined}>
                      <Tarjeta>
                        <View style={styles.cuenta}>
                          <View style={styles.persona}>
                            <Avatar usuario={u} tam={48} />
                            <View style={styles.personaTextos}>
                              <View style={styles.nombreFila}>
                                <Text style={styles.nombre} numberOfLines={1}>
                                  {u.nombre} {u.apellido}
                                </Text>
                                {u.rol === "admin" && <Estado texto="Admin" tono="ok" icono="shield-checkmark" />}
                                {u.id === yo && <Estado texto="Vos" tono="neutro" />}
                              </View>
                              <Text style={styles.mail} numberOfLines={1} selectable>
                                {u.mail}
                              </Text>
                            </View>
                          </View>

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
                            <Estado texto={`${u.horarios} dosis`} tono="neutro" icono="time-outline" />
                            {edad !== null && <Estado texto={`${edad} años`} tono="neutro" icono="person-outline" />}
                          </View>

                          {u.listaPastillas && u.listaPastillas.length > 0 && (
                            <Text style={styles.pastillasDe} numberOfLines={2}>
                              {u.listaPastillas.map((p) => p.nombre).join(", ")}
                            </Text>
                          )}

                          <View style={styles.acciones}>
                            <Boton
                              titulo={u.verificado ? "Desverificar" : "Verificar"}
                              variante="secundario"
                              ancho="auto"
                              icono={u.verificado ? "close-circle-outline" : "checkmark-circle-outline"}
                              onPress={() => cambiarVerificacion(u)}
                              deshabilitado={ocupado === u.id}
                            />
                            <Boton
                              titulo="Vaciar"
                              variante="peligro"
                              ancho="auto"
                              icono="calendar-clear-outline"
                              onPress={() => borrarCalendario(u)}
                              deshabilitado={ocupado === u.id || u.horarios === 0}
                              ayuda="Borra las dosis que todavía no salieron"
                            />
                            {u.id !== yo && (
                              <Boton
                                titulo="Eliminar"
                                variante="peligro"
                                ancho="auto"
                                icono="trash-outline"
                                onPress={() => borrarCuenta(u)}
                                deshabilitado={ocupado === u.id}
                                ayuda="Borra la cuenta y todo lo suyo. No se puede deshacer"
                              />
                            )}
                          </View>
                        </View>
                      </Tarjeta>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  cabecera: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: espacio.lg,
    marginBottom: espacio.xl,
  },

  cabeceraTextos: {
    flex: 1,
  },

  cifras: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.md,
    marginTop: espacio.lg,
    marginBottom: espacio.lg,
  },

  cifra: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },

  cifraAncha: {
    flexBasis: "22%",
  },

  cifraValor: {
    ...texto.titulo,
    color: colores.acento,
  },

  cifraEtiqueta: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  cifraDetalle: {
    ...texto.dato,
    color: colores.atencion.texto,
    marginTop: 2,
  },

  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
    paddingHorizontal: espacio.md,
    marginBottom: espacio.lg,
  },

  buscadorCampo: {
    ...texto.cuerpo,
    flex: 1,
    color: colores.texto,
    paddingVertical: espacio.md,
  },

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  grillaItem: {
    width: "49%",
  },

  cuenta: {
    flex: 1,
  },

  persona: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
  },

  personaTextos: {
    flex: 1,
    minWidth: 0,
  },

  nombreFila: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espacio.sm,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
    flexShrink: 1,
  },

  mail: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: 2,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.md,
  },

  pastillasDe: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.sm,
  },

  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.lg,
    paddingTop: espacio.md,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
}));
