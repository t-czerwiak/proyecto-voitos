import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable, // Added missing import
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import LavaBackground from "../../components/LavaBackground";
import {
  getActividades,
  getHorariosDelUsuario,
  cancelarRutina,
  Horario,
} from "../../lib/voitos";
import { confirmar } from "../../lib/avisos";
import {
  armarRutinas,
  comoFecha,
  DIAS_SEMANA,
  Rutina,
} from "../../lib/rutinas";

type Actividad = {
  id: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: "rutina" | "una-vez";
  dias?: string[];
};

const meses = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

const diasSemana = DIAS_SEMANA;

export default function Calendario() {
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [actividades, setActividades] = useState<Actividad[]>([]);

  // Las dosis agendadas. Van aparte de las actividades porque son otra tabla y
  // se marcan distinto: una rutina de medicacion ya viene materializada como
  // una fila por dia, asi que no hay que resolver dias de la semana.
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [borrando, setBorrando] = useState(false);

  const rutinas = useMemo(() => armarRutinas(horarios), [horarios]);

  const recargarHorarios = () =>
    getHorariosDelUsuario()
      .then(setHorarios)
      .catch(() => setHorarios([]));

  const handleBorrarRutina = async (rutina: Rutina) => {
    const seguir = await confirmar(
      `Borrar la rutina de ${rutina.nombre}`,
      `Se borran las ${rutina.pendientes} dosis que todavía no salieron. ` +
        `Las ya tomadas quedan en el historial.

¿Seguro?`,
      "Borrar rutina"
    );
    if (!seguir) return;

    setBorrando(true);
    try {
      await cancelarRutina(rutina.pastillaId);
      await recargarHorarios();
    } finally {
      setBorrando(false);
    }
  };

  // Se recargan cada vez que la pantalla vuelve a estar en foco, asi al volver
  // de "agregar actividad" ya aparece la nueva.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      getActividades()
        .then((datos) => {
          if (vigente) setActividades(datos as Actividad[]);
        })
        .catch(() => {
          // Sin sesion o sin backend: el calendario se muestra vacio
          if (vigente) setActividades([]);
        });

      getHorariosDelUsuario()
        .then((datos) => {
          if (vigente) setHorarios(datos);
        })
        .catch(() => {
          if (vigente) setHorarios([]);
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

    for (let i = 0; i < primerDiaAjustado; i++) {
      dias.push(null);
    }

    for (let dia = 1; dia <= cantidadDias; dia++) {
      dias.push(dia);
    }

    return dias;
  }, [mes, anio, primerDiaAjustado, cantidadDias]);

  function obtenerFecha(dia: number) {
    const mesTexto = String(mes + 1).padStart(2, "0");
    const diaTexto = String(dia).padStart(2, "0");

    return `${anio}-${mesTexto}-${diaTexto}`;
  }

  function tieneActividad(dia: number) {
    const fecha = obtenerFecha(dia);

    return actividades.some((actividad) => {
      if (actividad.tipo === "una-vez") {
        return actividad.fecha === fecha;
      }

      const fechaObjeto = new Date(`${fecha}T12:00:00`);

      const diaSemana = fechaObjeto.getDay();

      const indice = diaSemana === 0 ? 6 : diaSemana - 1;

      return actividad.dias?.includes(diasSemana[indice]);
    });
  }

  // Las rutinas que tienen una dosis este dia. Se usa para pintar un marcador
  // por rutina, cada uno con su color, en vez de un punto generico.
  function rutinasDelDia(dia: number) {
    const fecha = obtenerFecha(dia);
    const conDosis = new Set(
      horarios.filter((h) => h.dia === fecha).map((h) => h.pastilla_id)
    );
    return rutinas.filter((r) => conDosis.has(r.pastillaId));
  }

  function medicacionDelDia() {
    return horarios.filter((h) => h.dia === fechaSeleccionada);
  }

  function actividadesDelDia() {
    return actividades.filter((actividad) => {
      if (actividad.tipo === "una-vez") {
        return actividad.fecha === fechaSeleccionada;
      }

      const fecha = new Date(`${fechaSeleccionada}T12:00:00`);

      const diaSemana = fecha.getDay();

      const indice = diaSemana === 0 ? 6 : diaSemana - 1;

      return actividad.dias?.includes(diasSemana[indice]);
    });
  }

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

  function agregarActividad() {
    router.push({
      pathname: "/agregar-actividad",
      params: {
        fecha: fechaSeleccionada,
      },
    });
  }

  return (
    <View style={styles.container}>
      <LavaBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/home")}>
          <Text style={styles.title}>CALENDARIO</Text>
        </Pressable>

        {/* AÑO */}

        <View style={styles.yearContainer}>
          <TouchableOpacity
            style={styles.arrow}
            onPress={() => setAnio(anio - 1)}
          >
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.year}>{anio}</Text>

          <TouchableOpacity
            style={styles.arrow}
            onPress={() => setAnio(anio + 1)}
          >
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* MES */}

        <View style={styles.monthContainer}>
          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => cambiarMes(-1)}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.month}>{meses[mes]}</Text>

          <TouchableOpacity
            style={styles.monthArrow}
            onPress={() => cambiarMes(1)}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* DÍAS DE LA SEMANA */}

        <View style={styles.weekHeader}>
          {diasSemana.map((dia) => (
            <Text key={dia} style={styles.weekText}>
              {dia}
            </Text>
          ))}
        </View>

        {/* CALENDARIO */}

        <View style={styles.calendar}>
          {diasCalendario.map((dia, index) => {
            if (dia === null) {
              return (
                <View
                  key={`empty-${index}`}
                  style={styles.day}
                />
              );
            }

            const fecha = obtenerFecha(dia);

            const seleccionado =
              fecha === fechaSeleccionada;

            const actividad = tieneActividad(dia);

            return (
              <TouchableOpacity
                key={dia}
                style={[
                  styles.day,
                  seleccionado && styles.selectedDay,
                ]}
                onPress={() => {
                  setFechaSeleccionada(fecha);
                }}
              >
                <Text
                  style={[
                    styles.dayText,
                    seleccionado && styles.selectedDayText,
                  ]}
                >
                  {dia}
                </Text>

                <View style={styles.dotsRow}>
                  {actividad && <View style={styles.activityDot} />}
                  {rutinasDelDia(dia).map((r) => (
                    <View
                      key={r.pastillaId}
                      style={[
                        styles.medicationDot,
                        { backgroundColor: r.color, shadowColor: r.color },
                      ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* RUTINAS ACTIVAS */}

        {rutinas.length > 0 && (
          <View style={styles.activitiesContainer}>
            <Text style={styles.activitiesTitle}>RUTINAS</Text>

            {rutinas.map((r) => (
              <View key={r.pastillaId} style={styles.activity}>
                {/* Misma barra de color que el marcador del calendario, asi
                    se ve de una cual rutina es cual */}
                <View
                  style={[
                    styles.rutinaColor,
                    { backgroundColor: r.color, shadowColor: r.color },
                  ]}
                />

                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>
                    {r.nombre} · {r.hora}
                  </Text>

                  <Text style={styles.activityType}>
                    {r.dias.join("  ")} · {r.semanas === 1 ? "1 SEMANA" : `${r.semanas} SEMANAS`}
                  </Text>

                  <Text style={styles.rutinaDetalle}>
                    {comoFecha(r.desde)} al {comoFecha(r.hasta)}
                  </Text>

                  <Text style={styles.rutinaDetalle}>
                    {r.dosis} dosis de {r.cantidad} · {r.pendientes} sin tomar
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.botonBorrar}
                  onPress={() => handleBorrarRutina(r)}
                  disabled={borrando}
                >
                  <Text style={styles.botonBorrarTexto}>BORRAR</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* FECHA SELECCIONADA */}

        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateTitle}>
            FECHA SELECCIONADA
          </Text>

          <Text style={styles.selectedDate}>
            {fechaSeleccionada.split("-").reverse().join("/")}
          </Text>
        </View>

        {/* MEDICACIÓN DEL DÍA */}

        <View style={styles.activitiesContainer}>
          <Text style={styles.activitiesTitle}>
            MEDICACIÓN
          </Text>

          {medicacionDelDia().length === 0 ? (
            <Text style={styles.noActivities}>
              No hay dosis para este día
            </Text>
          ) : (
            medicacionDelDia()
              .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto)
              .map((dosis) => (
                <View key={dosis.id} style={styles.activity}>
                  <Text style={styles.activityTime}>
                    {String(dosis.hora).padStart(2, "0")}:
                    {String(dosis.minuto).padStart(2, "0")}
                  </Text>

                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>
                      {dosis.pastillas?.nombre ?? "Pastilla"}
                    </Text>

                    <Text style={styles.activityType}>
                      {dosis.cantidad === 1
                        ? "1 PASTILLA"
                        : `${dosis.cantidad} PASTILLAS`}
                      {dosis.dispensado ? " · TOMADA" : ""}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* ACTIVIDADES DEL DÍA */}

        <View style={styles.activitiesContainer}>
          <Text style={styles.activitiesTitle}>
            ACTIVIDADES
          </Text>

          {actividadesDelDia().length === 0 ? (
            <Text style={styles.noActivities}>
              No hay actividades para este día
            </Text>
          ) : (
            actividadesDelDia()
              .sort((a, b) =>
                a.hora.localeCompare(b.hora)
              )
              .map((actividad) => (
                <View
                  key={actividad.id}
                  style={styles.activity}
                >
                  <Text style={styles.activityTime}>
                    {actividad.hora}
                  </Text>

                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>
                      {actividad.nombre}
                    </Text>

                    <Text style={styles.activityType}>
                      {actividad.tipo === "rutina"
                        ? "RUTINA"
                        : "UNA VEZ"}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* AGREGAR ACTIVIDAD */}

        <TouchableOpacity
          style={styles.addButton}
          onPress={agregarActividad}
        >
          <Text style={styles.addButtonText}>
            + AGREGAR ACTIVIDAD
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 55,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 20,
  },

  // AÑO

  yearContainer: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  year: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#00FF7F",
    backgroundColor: "#01250E",
    alignItems: "center",
    justifyContent: "center",
  },

  arrowText: {
    color: "#00FF7F",
    fontSize: 32,
    lineHeight: 34,
  },

  // MES

  monthContainer: {
    width: "90%",
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#01250E",
    borderWidth: 2,
    borderColor: "#105A2C",
    borderRadius: 15,
    marginBottom: 20,
  },

  month: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  monthArrow: {
    width: 50,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  monthArrowText: {
    color: "#00FF7F",
    fontSize: 32,
  },

  // DÍAS

  weekHeader: {
    width: "95%",
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },

  weekText: {
    width: 40,
    textAlign: "center",
    color: "#00FF7F",
    fontSize: 15,
    fontWeight: "bold",
  },

  // CALENDARIO

  calendar: {
    width: "90%",
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(0, 27, 12, 0.8)",
    borderWidth: 1,
    borderColor: "#105A2C",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 3,
  },

  day: {
    width: "14.285%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },

  dayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  selectedDay: {
    backgroundColor: "#00FF7F",
  },

  selectedDayText: {
    color: "#000000",
    fontWeight: "bold",
  },

  // Los dos puntos van en una fila para que un dia con actividad Y medicacion
  // los muestre juntos en vez de pisarse.
  dotsRow: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: "90%",
    gap: 4,
  },

  // Franja vertical de color al costado de la rutina, del mismo color que su
  // marcador en el calendario.
  rutinaColor: {
    width: 6,
    height: 46,
    borderRadius: 3,
    marginRight: 14,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  rutinaDetalle: {
    color: "#7FA98C",
    fontSize: 12,
    marginTop: 2,
  },

  botonBorrar: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#2a0d0d",
    borderWidth: 1,
    borderColor: "#7a1f1f",
  },

  botonBorrarTexto: {
    color: "#FF8080",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  activityDot: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF7F",
    shadowColor: "#00FF7F",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  // Barra y no punto: un circulo de 4px se perdia contra el fondo oscuro.
  // El color lo pone cada rutina en linea, esto es solo la forma.
  medicationDot: {
    width: 14,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  // FECHA

  selectedDateContainer: {
    width: "75%",
    alignItems: "center",
    marginTop: 20,
  },

  selectedDateTitle: {
    color: "#90EE90",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  selectedDate: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },

  // ACTIVIDADES

  activitiesContainer: {
    width: "75%",
    marginTop: 20,
  },

  activitiesTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },

  noActivities: {
    color: "#AAAAAA",
    fontSize: 16,
    textAlign: "center",
    paddingVertical: 20,
  },

  activity: {
    width: "100%",
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#01250E",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#105A2C",
    marginBottom: 10,
    paddingHorizontal: 15,
  },

  activityTime: {
    color: "#00FF7F",
    fontSize: 18,
    fontWeight: "bold",
    width: 65,
  },

  activityInfo: {
    flex: 1,
  },

  activityName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  activityType: {
    color: "#90EE90",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },

  // BOTÓN

  addButton: {
    width: 280,
    height: 60,
    backgroundColor: "#004E1E",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#00FF7F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,

    shadowColor: "#00FF7F",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

