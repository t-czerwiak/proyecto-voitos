import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import LavaBackground from "../../components/LavaBackground";

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

const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];

export default function Calendario() {
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [actividades] = useState<Actividad[]>([
    {
      id: "1",
      nombre: "Gimnasia",
      fecha: "2026-08-10",
      hora: "08:00",
      tipo: "rutina",
      dias: ["L", "X", "V"],
    },
    {
      id: "2",
      nombre: "Turno médico",
      fecha: "2026-08-15",
      hora: "14:30",
      tipo: "una-vez",
    },
  ]);

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
  }, [mes, anio]);

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

  return (
    <View style={styles.container}>
      <LavaBackground />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>CALENDARIO</Text>

        {/* CAMBIO DE AÑO */}

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

          <Text style={styles.month}>
            {meses[mes]}
          </Text>

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
            <Text
              key={dia}
              style={styles.weekText}
            >
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
                onPress={() =>
                  setFechaSeleccionada(fecha)
                }
              >
                <Text
                  style={[
                    styles.dayText,
                    seleccionado &&
                      styles.selectedDayText,
                  ]}
                >
                  {dia}
                </Text>

                {actividad && (
                  <View style={styles.activityDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ACTIVIDADES DEL DÍA */}

        <View style={styles.activitiesContainer}>
          <Text style={styles.selectedDate}>
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

        {/* AGREGAR */}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push("/agregar-actividad")
          }
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

  // -------------------------
  // AÑO
  // -------------------------

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

  // -------------------------
  // MES
  // -------------------------

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

  // -------------------------
  // DÍAS DE LA SEMANA
  // -------------------------

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

  // -------------------------
  // CALENDARIO
  // -------------------------

  calendar: {
    width: "95%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    backgroundColor: "rgba(0, 27, 12, 0.75)",
    borderWidth: 1,
    borderColor: "#105A2C",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },

  day: {
    width: "14.285%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
  },

  dayText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  selectedDay: {
    backgroundColor: "#00FF7F",
  },

  selectedDayText: {
    color: "#000000",
    fontWeight: "bold",
  },

  activityDot: {
    position: "absolute",
    bottom: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00FF7F",
  },

  // -------------------------
  // ACTIVIDADES
  // -------------------------

  activitiesContainer: {
    width: "75%",
    marginTop: 25,
  },

  selectedDate: {
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

  // -------------------------
  // BOTÓN AGREGAR
  // -------------------------

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

activityDot: {
  position: "absolute",
  bottom: 4,
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: "#00FF7F",
}),