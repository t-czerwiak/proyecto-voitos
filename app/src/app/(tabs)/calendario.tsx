import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  getActividades,
  getHorariosDelUsuario,
  cancelarRutina,
  Actividad,
  Horario,
} from "../../lib/voitos";
import { confirmar } from "../../lib/avisos";
import {
  armarRutinas,
  comoFecha,
  DIAS_SEMANA,
  letraDelDia,
  rutinaDeHorario,
  rutinasActivas,
  rutinasEnFecha,
  Rutina,
} from "../../lib/rutinas";
import { esHoy, fechaLarga, fechaRelativa, hoyISO, MESES_LARGOS } from "../../lib/fechas";
import FilaDosis from "../../components/FilaDosis";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Boton,
  Aviso,
  Vacio,
  Cargando,
  Estado,
} from "../../ui";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../../tema";

// Nombre completo del dia de la semana, para el lector de pantalla. La letra
// suelta ("X") no es una palabra que nadie pueda escuchar.
const NOMBRE_DIA: Record<string, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

export default function Calendario() {
  const styles = useEstilos();
  const colores = useColores();

  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO());

  const [actividades, setActividades] = useState<Actividad[]>([]);

  // Las dosis agendadas. Van aparte de las actividades porque son otra tabla y
  // se marcan distinto: una rutina de medicacion ya viene materializada como
  // una fila por dia, asi que no hay que resolver dias de la semana.
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [borrando, setBorrando] = useState(false);
  const [errorRutina, setErrorRutina] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  const rutinas = useMemo(() => armarRutinas(horarios, colores.rutinas), [horarios, colores.rutinas]);

  // Las que se listan abajo son solo las que siguen teniendo dosis por salir.
  // Una rutina terminada no se puede borrar ni modificar, asi que listarla solo
  // confunde: al cancelarla quedaba ahi con "0 sin tomar" y parecia rota.
  const activas = useMemo(() => rutinasActivas(rutinas), [rutinas]);

  const recargarHorarios = () =>
    getHorariosDelUsuario()
      .then((datos) => {
        setHorarios(datos);
        setErrorCarga("");
      })
      .catch((e: any) =>
        setErrorCarga(e?.message ?? "No se pudieron cargar las dosis")
      );

  const handleBorrarRutina = async (rutina: Rutina) => {
    const seguir = await confirmar(
      `Borrar la rutina de ${rutina.nombre}`,
      `${rutina.horaTexto}, ${rutina.dias.join(" ")}.\n\n` +
        `Se borran las ${rutina.pendientes} dosis que todavía no salieron. ` +
        `Las ya dispensadas quedan en el historial.\n\n¿Seguro?`,
      "Borrar rutina"
    );
    if (!seguir) return;

    setBorrando(true);
    setErrorRutina("");
    try {
      // Se mandan hora, minuto y rango para borrar SOLO esta rutina. Sin eso
      // se llevaria por delante las otras rutinas de la misma pastilla.
      await cancelarRutina(rutina.pastillaId, {
        hora: rutina.hora,
        minuto: rutina.minuto,
        desde: rutina.desde,
        hasta: rutina.hasta,
      });
      await recargarHorarios();
    } catch (e: any) {
      setErrorRutina(e.message ?? "No se pudo borrar la rutina");
    } finally {
      setBorrando(false);
    }
  };

  // Carga inicial y recarga al volver a la pantalla.
  //
  // Va con useFocusEffect y no useEffect porque el Stack de expo-router deja
  // la pantalla montada: al volver de agendar una dosis, un useEffect con []
  // no se volveria a ejecutar y el calendario seguiria mostrando lo viejo.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      getActividades()
        .then((datos) => vigente && setActividades(datos))
        .catch(() => vigente && setActividades([]));

      getHorariosDelUsuario()
        .then((datos) => {
          if (!vigente) return;
          setHorarios(datos);
          setErrorCarga("");
        })
        .catch((e: any) => {
          // Antes esto vaciaba la lista en silencio, asi que un 401 o un
          // backend caido se veian identicos a "no hay dosis para este dia".
          if (!vigente) return;
          setHorarios([]);
          setErrorCarga(e?.message ?? "No se pudieron cargar las dosis");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  const cantidadDias = new Date(anio, mes + 1, 0).getDate();
  const primerDia = new Date(anio, mes, 1).getDay();

  // Convertimos domingo=0 a lunes=0
  const primerDiaAjustado = primerDia === 0 ? 6 : primerDia - 1;

  const diasCalendario = useMemo(() => {
    const dias: (number | null)[] = [];
    for (let i = 0; i < primerDiaAjustado; i++) dias.push(null);
    for (let dia = 1; dia <= cantidadDias; dia++) dias.push(dia);
    return dias;
  }, [primerDiaAjustado, cantidadDias]);

  const fechaDe = (dia: number) =>
    `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const actividadesEn = (fecha: string) =>
    actividades.filter((a) =>
      a.tipo === "una-vez" ? a.fecha === fecha : a.dias?.includes(letraDelDia(fecha))
    );

  // Las rutinas que tienen una dosis este dia.
  //
  // Se compara contra las fechas de cada rutina. Antes se filtraba por
  // pastilla, y como varias rutinas pueden ser de la misma pastilla, un dia con
  // una sola dosis pintaba el marcador de todas.
  // Solo las activas: marcar tambien las terminadas llenaba el calendario de
  // dosis viejas con colores que no correspondian a ninguna tarjeta de abajo.
  const rutinasEn = (fecha: string) => rutinasEnFecha(activas, fecha);

  const dosisDelDia = useMemo(
    () =>
      horarios
        .filter((h) => h.dia === fechaSeleccionada)
        .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto),
    [horarios, fechaSeleccionada]
  );

  const actividadesDelDia = useMemo(
    () => actividadesEn(fechaSeleccionada).sort((a, b) => a.hora.localeCompare(b.hora)),
    [actividades, fechaSeleccionada]
  );

  function cambiarMes(valor: number) {
    let nuevoMes = mes + valor;
    let nuevoAnio = anio;

    if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio++;
    }
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio--;
    }

    setMes(nuevoMes);
    setAnio(nuevoAnio);
  }

  const irAHoy = () => {
    const ahora = new Date();
    setMes(ahora.getMonth());
    setAnio(ahora.getFullYear());
    setFechaSeleccionada(hoyISO());
  };

  return (
    <Pantalla>
      <Encabezado
        titulo="Calendario"
        bajada="Tocá un día para ver qué hay agendado."
        volverA="/home"
      />

      <Aviso texto={errorCarga} />

      {/* MES */}
      <View style={styles.navegacion}>
        <Pressable
          onPress={() => cambiarMes(-1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.flechaActiva]}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={24} color={colores.acento} />
        </Pressable>

        <Text style={styles.mes} accessibilityRole="header">
          {MESES_LARGOS[mes]} {anio}
        </Text>

        <Pressable
          onPress={() => cambiarMes(1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.flechaActiva]}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={24} color={colores.acento} />
        </Pressable>
      </View>

      {/* GRILLA */}
      <View style={styles.grilla}>
        <View style={styles.semana}>
          {DIAS_SEMANA.map((dia) => (
            <Text
              key={dia}
              style={styles.diaSemana}
              // La cabecera de la columna la lee cada celda en su propia
              // etiqueta, asi que repetirla acá solo alarga la escucha.
              accessibilityElementsHidden
            >
              {dia}
            </Text>
          ))}
        </View>

        <View style={styles.dias}>
          {diasCalendario.map((dia, i) => {
            if (dia === null) {
              return <View key={`vacio-${i}`} style={styles.celda} />;
            }

            const fecha = fechaDe(dia);
            const elegido = fecha === fechaSeleccionada;
            const hoy = esHoy(fecha);
            const susRutinas = rutinasEn(fecha);
            const susActividades = actividadesEn(fecha);

            // Todo lo que el ojo saca de los colores, dicho en palabras.
            const partes: string[] = [fechaLarga(fecha)];
            if (hoy) partes.push("hoy");
            if (susRutinas.length)
              partes.push(
                susRutinas.length === 1
                  ? "1 dosis agendada"
                  : `${susRutinas.length} dosis agendadas`
              );
            if (susActividades.length)
              partes.push(
                susActividades.length === 1
                  ? "1 actividad"
                  : `${susActividades.length} actividades`
              );
            if (!susRutinas.length && !susActividades.length) partes.push("sin nada agendado");

            return (
              <Pressable
                key={dia}
                onPress={() => setFechaSeleccionada(fecha)}
                style={({ pressed }) => [
                  styles.celda,
                  styles.celdaTocable,
                  hoy && styles.celdaHoy,
                  elegido && styles.celdaElegida,
                  pressed && styles.celdaActiva,
                ]}
                accessibilityRole="button"
                accessibilityLabel={partes.join(", ")}
                accessibilityState={{ selected: elegido }}
                // react-native-web no traduce accessibilityState.selected en
                // un role="button", asi que el navegador no anunciaba cual
                // era el dia elegido. Se pone a mano.
                aria-selected={elegido}
              >
                <Text
                  style={[
                    styles.numero,
                    hoy && styles.numeroHoy,
                    elegido && styles.numeroElegido,
                  ]}
                >
                  {dia}
                </Text>

                {/* Los marcadores son una ayuda visual. Lo que significan está
                    escrito en la referencia de abajo y en la etiqueta de la
                    celda, así que nadie depende del color. */}
                <View style={styles.marcadores}>
                  {susActividades.length > 0 && (
                    <View style={[styles.marcador, styles.marcadorActividad]} />
                  )}
                  {susRutinas.slice(0, 3).map((r) => (
                    <View
                      key={r.id}
                      style={[styles.marcador, { backgroundColor: r.color }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.bajoGrilla}>
        <Boton
          titulo="Ir a hoy"
          variante="enlace"
          icono="today-outline"
          onPress={irAHoy}
          ancho="auto"
        />
      </View>

      {/* REFERENCIA DE COLORES
          Sin esto, los colores del calendario son adivinanza: se ven tres
          barras distintas y no hay forma de saber cuál es cuál sin abrir cada
          día uno por uno. */}
      {activas.length > 0 && (
        <View style={styles.referencia}>
          <Text style={styles.tituloReferencia}>Qué es cada color</Text>

          {activas.map((r) => (
            <View
              key={r.id}
              style={styles.filaReferencia}
              accessible
              accessibilityLabel={`${r.nombre}, a las ${r.horaTexto}`}
            >
              <View style={[styles.muestra, { backgroundColor: r.color }]} />
              <Text style={styles.textoReferencia}>
                {r.nombre} · {r.horaTexto}
              </Text>
            </View>
          ))}

          <View style={styles.filaReferencia} accessible accessibilityLabel="Actividades">
            <View style={[styles.muestra, styles.marcadorActividad]} />
            <Text style={styles.textoReferencia}>Actividades</Text>
          </View>
        </View>
      )}

      {/* DÍA ELEGIDO */}
      <View style={styles.seccion}>
        <View style={styles.tituloDia}>
          <Text style={styles.tituloSeccion} accessibilityRole="header">
            {fechaLarga(fechaSeleccionada)}
          </Text>
          {esHoy(fechaSeleccionada) && <Estado texto="Hoy" tono="ok" icono="today" />}
        </View>

        {cargando ? (
          <Cargando texto="Buscando lo agendado..." />
        ) : (
          <>
            <Text style={styles.subtitulo}>Medicación</Text>

            {dosisDelDia.length === 0 ? (
              <Vacio
                icono="medkit-outline"
                titulo="No hay dosis para este día"
                detalle="Las dosis se agendan desde Pastillas, eligiendo los días de la semana."
                accion={{
                  titulo: "Agendar una dosis",
                  onPress: () => router.push("/agendar-medicacion"),
                }}
              />
            ) : (
              dosisDelDia.map((dosis) => {
                // La rutina de la que sale esta dosis, para pintarla del mismo
                // color que su marcador en el calendario.
                const suRutina = rutinaDeHorario(activas, dosis);
                return (
                  <FilaDosis
                    key={dosis.id}
                    dosis={dosis}
                    color={suRutina?.color}
                    detalle={
                      suRutina
                        ? `Rutina: ${suRutina.dias.join(" ")} a las ${suRutina.horaTexto}`
                        : "Dosis suelta"
                    }
                  />
                );
              })
            )}

            <Text style={styles.subtitulo}>Actividades</Text>

            {actividadesDelDia.length === 0 ? (
              <Vacio
                icono="walk-outline"
                titulo="No hay actividades para este día"
                detalle="Sirven para anotar lo que no dispensa el pastillero: una caminata, el kinesiólogo, una visita."
              />
            ) : (
              actividadesDelDia.map((a) => (
                <Tarjeta key={a.id}>
                  <View
                    style={styles.actividad}
                    accessible
                    accessibilityLabel={`A las ${a.hora}, ${a.nombre}. ${
                      a.tipo === "rutina" ? "Se repite todas las semanas" : "Una sola vez"
                    }.`}
                  >
                    <Text style={styles.actividadHora}>{a.hora}</Text>

                    <View style={styles.actividadDatos}>
                      <Text style={styles.actividadNombre}>{a.nombre}</Text>
                      <Text style={styles.actividadTipo}>
                        {a.tipo === "rutina" ? "Todas las semanas" : "Una sola vez"}
                      </Text>
                    </View>
                  </View>
                </Tarjeta>
              ))
            )}

            <View style={styles.agregar}>
              <Boton
                titulo="Agregar una actividad"
                variante="secundario"
                icono="add-outline"
                onPress={() =>
                  router.push({
                    pathname: "/agregar-actividad",
                    params: { fecha: fechaSeleccionada },
                  })
                }
                ayuda={`Se agrega el ${fechaLarga(fechaSeleccionada)}`}
              />
            </View>
          </>
        )}
      </View>

      {/* RUTINAS EN CURSO */}
      {activas.length > 0 && (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion} accessibilityRole="header">
            Rutinas en curso
          </Text>

          <Aviso texto={errorRutina} />

          {activas.map((r) => (
            <Tarjeta key={r.id} franja={r.color}>
              <Text style={styles.rutinaNombre}>{r.nombre}</Text>

              <Text style={styles.rutinaHora}>
                Todos los días marcados, a las {r.horaTexto}
              </Text>

              {/* Los siete días siempre a la vista, con los de la rutina
                  encendidos. Leer "L M X V" suelto obliga a reconstruir la
                  semana mentalmente; así se ve de una. */}
              <View
                style={styles.diasRutina}
                accessible
                accessibilityLabel={`Se repite los ${r.dias
                  .map((d) => NOMBRE_DIA[d])
                  .join(", ")}`}
              >
                {DIAS_SEMANA.map((d) => {
                  const activo = r.dias.includes(d);
                  return (
                    <Text
                      key={d}
                      style={[
                        styles.diaRutina,
                        activo && {
                          color: "#0A0A0A",
                          backgroundColor: r.color,
                        },
                      ]}
                    >
                      {d}
                    </Text>
                  );
                })}
              </View>

              {r.proxima && (
                <Text style={styles.rutinaProxima}>
                  La próxima es {fechaRelativa(r.proxima)} a las {r.horaTexto}
                </Text>
              )}

              <Text style={styles.rutinaDetalle}>
                {r.cantidad === 1 ? "1 pastilla" : `${r.cantidad} pastillas`} por dosis ·{" "}
                {r.pendientes} de {r.dosis} sin salir
              </Text>

              <Text style={styles.rutinaDetalle}>
                {r.semanas === 1 ? "1 semana" : `${r.semanas} semanas`} · del{" "}
                {comoFecha(r.desde)} al {comoFecha(r.hasta)}
              </Text>

              <View style={styles.borrar}>
                <Boton
                  titulo="Borrar la rutina"
                  variante="peligro"
                  icono="trash-outline"
                  onPress={() => handleBorrarRutina(r)}
                  deshabilitado={borrando}
                  ayuda={`Se borran las ${r.pendientes} dosis que todavía no salieron`}
                />
              </View>
            </Tarjeta>
          ))}
        </View>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  navegacion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.xs,
    marginBottom: espacio.lg,
  },

  flecha: {
    width: toque.comodo,
    height: toque.comodo,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radio.md,
    backgroundColor: colores.superficieAlta,
  },

  flechaActiva: {
    backgroundColor: colores.borde,
  },

  mes: {
    ...texto.seccion,
    color: colores.texto,
    flex: 1,
    textAlign: "center",
    // El nombre del mes va en minúscula porque así se lee más rápido: las
    // mayúsculas sostenidas borran la silueta de la palabra.
    textTransform: "capitalize",
  },

  grilla: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
  },

  semana: {
    flexDirection: "row",
    marginBottom: espacio.xs,
  },

  diaSemana: {
    ...texto.cuerpoFuerte,
    color: colores.acentoSuave,
    width: `${100 / 7}%`,
    textAlign: "center",
  },

  dias: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  celda: {
    width: `${100 / 7}%`,
    // Antes era el minimo de 48px y el numero se centraba JUNTO con los
    // marcadores, asi que un dia con dosis empujaba su numero hacia arriba y
    // los numeros de la grilla no quedaban alineados entre filas. Ahora la
    // celda es mas alta, el numero arranca siempre a la misma distancia del
    // borde y los marcadores van anclados abajo, fuera del flujo.
    minHeight: 64,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingTop: 9,
    paddingBottom: 14,
  },

  celdaTocable: {
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: "transparent",
  },

  // Hoy se marca con borde, no con relleno: el relleno queda reservado para
  // el día que uno eligió, y así los dos estados se pueden ver a la vez.
  celdaHoy: {
    borderColor: colores.bordeFuerte,
  },

  celdaElegida: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },

  celdaActiva: {
    borderColor: colores.texto,
  },

  numero: {
    ...texto.item,
    // Numeros de ancho fijo: en una grilla, un 11 mas angosto que un 30 se
    // nota y desalinea la columna.
    fontVariant: ["tabular-nums" as const],
    color: colores.texto,
  },

  numeroHoy: {
    color: colores.acento,
  },

  numeroElegido: {
    color: colores.sobreAcento,
  },

  marcadores: {
    position: "absolute" as const,
    bottom: 7,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 3,
    minHeight: 5,
  },

  marcador: {
    width: 12,
    height: 5,
    borderRadius: 3,
  },

  marcadorActividad: {
    backgroundColor: colores.acentoSuave,
  },

  bajoGrilla: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: espacio.sm,
  },

  referencia: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginTop: espacio.md,
    gap: espacio.sm,
  },

  tituloReferencia: {
    ...texto.etiqueta,
    color: colores.textoSuave,
    marginBottom: espacio.xs,
  },

  filaReferencia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
  },

  muestra: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },

  textoReferencia: {
    ...texto.dato,
    color: colores.texto,
    flex: 1,
  },

  seccion: {
    marginTop: espacio.xxl,
  },

  tituloDia: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espacio.md,
    marginBottom: espacio.lg,
  },

  tituloSeccion: {
    ...texto.seccion,
    color: colores.texto,
    textTransform: "capitalize",
  },

  subtitulo: {
    ...texto.etiqueta,
    color: colores.acentoSuave,
    marginTop: espacio.lg,
    marginBottom: espacio.md,
  },

  actividad: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
  },

  actividadHora: {
    ...texto.hora,
    color: colores.acento,
    minWidth: 78,
  },

  actividadDatos: {
    flex: 1,
  },

  actividadNombre: {
    ...texto.item,
    color: colores.texto,
  },

  actividadTipo: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: 2,
  },

  agregar: {
    marginTop: espacio.lg,
  },

  rutinaNombre: {
    ...texto.item,
    color: colores.texto,
  },

  rutinaHora: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.xs,
  },

  diasRutina: {
    flexDirection: "row",
    gap: espacio.xs,
    marginTop: espacio.md,
    marginBottom: espacio.md,
  },

  // Apagado por defecto; el color lo enciende la rutina en línea.
  diaRutina: {
    ...texto.etiqueta,
    width: 28,
    height: 28,
    lineHeight: 28,
    borderRadius: 14,
    textAlign: "center",
    color: colores.textoTenue,
    backgroundColor: colores.neutro.fondo,
    overflow: "hidden",
  },

  rutinaProxima: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  rutinaDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: espacio.xs,
  },

  borrar: {
    marginTop: espacio.lg,
  },
}));
