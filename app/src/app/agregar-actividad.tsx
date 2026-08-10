import React, { useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import LavaBackground from "../components/LavaBackground";
import { crearActividad } from "../lib/voitos";

export default function AgregarActividad() {
  const { fecha: fechaParametro } = useLocalSearchParams<{
    fecha?: string;
  }>();

  const [nombre, setNombre] = useState("");
  const [hora, setHora] = useState("");
  const [tipo, setTipo] = useState<"rutina" | "una-vez">("una-vez");

  // La fecha viene automáticamente desde el calendario
  const [fecha] = useState(fechaParametro || "");

  const diasSemana = ["L", "M", "X", "J", "V", "S", "D"];

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);

  function seleccionarDia(dia: string) {
    if (diasSeleccionados.includes(dia)) {
      setDiasSeleccionados(
        diasSeleccionados.filter((d) => d !== dia)
      );
    } else {
      setDiasSeleccionados([
        ...diasSeleccionados,
        dia,
      ]);
    }
  }

  function formatearFecha(fecha: string) {
    if (!fecha) return "Sin fecha";

    const partes = fecha.split("-");

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  async function guardarActividad() {
    if (!nombre || !hora) {
      return;
    }

    if (tipo === "una-vez" && !fecha) {
      return;
    }

    if (
      tipo === "rutina" &&
      diasSeleccionados.length === 0
    ) {
      return;
    }

    try {
      await crearActividad({
        nombre,
        hora,
        tipo,
        // Una actividad de rutina se repite por dia de semana, asi que no
        // tiene una fecha puntual. La base igual pide el campo.
        fecha: tipo === "una-vez" ? fecha : "",
        dias: tipo === "rutina" ? diasSeleccionados : [],
      });

      router.back();
    } catch (e: any) {
      Alert.alert("No se pudo guardar la actividad", e.message);
    }
  }

  return (
    <View style={styles.container}>
      <LavaBackground />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          AGREGAR ACTIVIDAD
        </Text>

        {/* NOMBRE */}

        <Text style={styles.label}>
          Nombre de la actividad
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ej: Gimnasia"
          placeholderTextColor="#999"
          value={nombre}
          onChangeText={setNombre}
        />

        {/* HORA */}

        <Text style={styles.label}>
          Hora
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ej: 08:30"
          placeholderTextColor="#999"
          value={hora}
          onChangeText={setHora}
          keyboardType="numbers-and-punctuation"
        />

        {/* TIPO */}

        <Text style={styles.label}>
          Tipo de actividad
        </Text>

        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              tipo === "una-vez" &&
                styles.typeButtonSelected,
            ]}
            onPress={() =>
              setTipo("una-vez")
            }
          >
            <Text
              style={[
                styles.typeText,
                tipo === "una-vez" &&
                  styles.typeTextSelected,
              ]}
            >
              UNA VEZ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              tipo === "rutina" &&
                styles.typeButtonSelected,
            ]}
            onPress={() =>
              setTipo("rutina")
            }
          >
            <Text
              style={[
                styles.typeText,
                tipo === "rutina" &&
                  styles.typeTextSelected,
              ]}
            >
              RUTINA
            </Text>
          </TouchableOpacity>
        </View>

        {/* ACTIVIDAD UNA VEZ */}

        {tipo === "una-vez" && (
          <>
            <Text style={styles.label}>
              Fecha seleccionada
            </Text>

            <View style={styles.dateBox}>
              <Text style={styles.dateText}>
                {formatearFecha(fecha)}
              </Text>
            </View>
          </>
        )}

        {/* RUTINA */}

        {tipo === "rutina" && (
          <>
            <Text style={styles.label}>
              Repetir los días
            </Text>

            <View style={styles.daysContainer}>
              {diasSemana.map((dia) => {
                const seleccionado =
                  diasSeleccionados.includes(dia);

                return (
                  <TouchableOpacity
                    key={dia}
                    style={[
                      styles.dayButton,
                      seleccionado &&
                        styles.dayButtonSelected,
                    ]}
                    onPress={() =>
                      seleccionarDia(dia)
                    }
                  >
                    <Text
                      style={[
                        styles.dayText,
                        seleccionado &&
                          styles.dayTextSelected,
                      ]}
                    >
                      {dia}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* GUARDAR */}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={guardarActividad}
        >
          <Text style={styles.saveButtonText}>
            AGREGAR ACTIVIDAD
          </Text>
        </TouchableOpacity>

        {/* CANCELAR */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>
            CANCELAR
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

  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 50,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 30,
  },

  label: {
    width: "90%",
    maxWidth: 420,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    width: "90%",
    maxWidth: 420,
    height: 55,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 17,
    color: "#000000",
  },

  // FECHA

  dateBox: {
    width: "90%",
    maxWidth: 420,
    height: 55,
    backgroundColor: "#01250E",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#00FF7F",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  dateText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  // TIPO

  typeContainer: {
    width: "90%",
    maxWidth: 420,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },

  typeButton: {
    width: "48%",
    height: 55,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#00FF7F",
    backgroundColor: "#01250E",
    alignItems: "center",
    justifyContent: "center",
  },

  typeButtonSelected: {
    backgroundColor: "#00FF7F",
  },

  typeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  typeTextSelected: {
    color: "#000000",
  },

  // DÍAS

  daysContainer: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 5,
  },

  dayButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#00FF7F",
    backgroundColor: "#01250E",
    alignItems: "center",
    justifyContent: "center",
  },

  dayButtonSelected: {
    backgroundColor: "#00FF7F",
  },

  dayText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  dayTextSelected: {
    color: "#000000",
  },

  // BOTÓN GUARDAR

  saveButton: {
    width: 280,
    height: 60,
    borderRadius: 15,
    backgroundColor: "#004E1E",
    borderWidth: 2,
    borderColor: "#00FF7F",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 35,

    shadowColor: "#00FF7F",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  // CANCELAR

  cancelButton: {
   marginTop: 15,
    paddingVertical: 10,
  },

  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});

