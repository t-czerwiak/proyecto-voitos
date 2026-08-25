import React, { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { crearActividad } from "../lib/voitos";
import { dosDigitos, fechaLarga } from "../lib/fechas";
import {
  Pantalla,
  Encabezado,
  Campo,
  Selector,
  Opciones,
  SelectorDias,
  Boton,
  Aviso,
} from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

// Agregar una actividad al calendario.
//
// Las actividades son lo que el pastillero no hace: la caminata, el
// kinesiólogo, la visita del médico. Sirven para que el calendario sea el
// calendario del día de la persona y no sólo el de sus pastillas.
//
// El cambio más importante es la hora: antes era un campo de texto libre con
// el ejemplo "08:30" adentro. Escrita a mano, la hora se equivoca —"8:30",
// "830", "8.30"— y el error recién aparecía al guardar. Ahora son dos
// desplegables y no hay forma de escribir una hora que no exista.
export default function AgregarActividad() {
  const styles = useEstilos();

  const { fecha: fechaParametro } = useLocalSearchParams<{ fecha?: string }>();

  const [nombre, setNombre] = useState("");
  const [hora, setHora] = useState(9);
  const [minuto, setMinuto] = useState(0);
  const [tipo, setTipo] = useState<"rutina" | "una-vez">("una-vez");
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);

  // La fecha viene del calendario, del día que estaba elegido.
  const [fecha] = useState(fechaParametro || "");

  const [error, setError] = useState("");
  const [errorNombre, setErrorNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardarActividad = async () => {
    setError("");
    setErrorNombre("");

    if (!nombre.trim()) {
      setErrorNombre("Escribí qué actividad es");
      return;
    }

    if (tipo === "una-vez" && !fecha) {
      setError("Volvé al calendario y tocá el día de la actividad");
      return;
    }

    if (tipo === "rutina" && diasSeleccionados.length === 0) {
      setError("Elegí al menos un día de la semana");
      return;
    }

    setGuardando(true);
    try {
      await crearActividad({
        nombre,
        hora: `${dosDigitos(hora)}:${dosDigitos(minuto)}`,
        tipo,
        // Una actividad de rutina se repite por dia de semana, asi que no
        // tiene una fecha puntual. La base igual pide el campo.
        fecha: tipo === "una-vez" ? fecha : "",
        dias: tipo === "rutina" ? diasSeleccionados : [],
      });

      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Pantalla>
      <Encabezado
        titulo="Agregar una actividad"
        bajada="Para lo que no dispensa el pastillero: una caminata, el kinesiólogo, una visita."
      />

      <Aviso texto={error} />

      <Campo
        etiqueta="Qué actividad es"
        valor={nombre}
        alCambiar={setNombre}
        ayuda="Por ejemplo: gimnasia, control con el cardiólogo."
        error={errorNombre}
      />

      <View style={styles.hora}>
        <View style={styles.horaCampo}>
          <Selector
            etiqueta="Hora"
            valor={String(hora)}
            alCambiar={(v) => setHora(Number(v))}
            opciones={HORAS.map((h) => ({ valor: String(h), etiqueta: dosDigitos(h) }))}
          />
        </View>

        <View style={styles.horaCampo}>
          <Selector
            etiqueta="Minutos"
            valor={String(minuto)}
            alCambiar={(v) => setMinuto(Number(v))}
            opciones={MINUTOS.map((m) => ({ valor: String(m), etiqueta: dosDigitos(m) }))}
          />
        </View>
      </View>

      <Opciones
        etiqueta="Cada cuánto"
        valor={tipo}
        alCambiar={(v) => setTipo(v as "rutina" | "una-vez")}
        opciones={[
          {
            valor: "una-vez",
            etiqueta: "Una sola vez",
            detalle: fecha ? `El ${fechaLarga(fecha)}` : "En el día elegido en el calendario",
          },
          {
            valor: "rutina",
            etiqueta: "Todas las semanas",
            detalle: "Se repite los días que elijas, sin fecha de fin",
          },
        ]}
      />

      {tipo === "una-vez" ? (
        <View style={styles.fecha}>
          <Text style={styles.fechaEtiqueta}>Día</Text>
          <Text style={styles.fechaValor}>
            {fecha ? fechaLarga(fecha) : "Ninguno: volvé al calendario y tocá un día"}
          </Text>
        </View>
      ) : (
        <SelectorDias
          etiqueta="Qué días se repite"
          seleccionados={diasSeleccionados}
          alCambiar={setDiasSeleccionados}
        />
      )}

      <Boton
        titulo={guardando ? "Guardando..." : "Agregar la actividad"}
        onPress={guardarActividad}
        cargando={guardando}
      />

      <Boton
        titulo="Cancelar"
        variante="enlace"
        onPress={() => router.back()}
        estilo={{ marginTop: espacio.sm }}
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  hora: {
    flexDirection: "row",
    gap: espacio.md,
  },

  horaCampo: {
    flex: 1,
  },

  fecha: {
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginBottom: espacio.lg,
  },

  fechaEtiqueta: {
    ...texto.etiqueta,
    color: colores.acentoSuave,
    marginBottom: espacio.xs,
  },

  fechaValor: {
    ...texto.item,
    color: colores.texto,
    textTransform: "capitalize",
  },
}));
