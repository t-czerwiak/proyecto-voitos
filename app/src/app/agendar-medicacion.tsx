import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  agendarPastilla,
  analizarStock,
  fechasDeLaRutina,
  getPastillas,
  Pastilla,
} from "../lib/voitos";
import { confirmar } from "../lib/avisos";
import { comoFecha } from "../lib/rutinas";
import { dosDigitos } from "../lib/fechas";
import {
  Pantalla,
  Encabezado,
  Selector,
  Contador,
  SelectorDias,
  Boton,
  Aviso,
  Vacio,
  Cargando,
} from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

const NOMBRE_DIA: Record<string, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

// Agendar una rutina de medicación.
//
// Es el formulario más largo de la aplicación y el que más caro sale
// equivocar: agendar mal son semanas de dosis a la hora equivocada. Por eso
// arriba del botón hay un resumen escrito en castellano de lo que se va a
// crear —"Aspirina, 2 pastillas, lunes y jueves a las 08:00, durante 4
// semanas: 8 dosis"—. Leer eso lleva tres segundos y ahorra el ida y vuelta
// de agendar, mirar el calendario y borrar todo.
export default function AgendarMedicacion() {
  const styles = useEstilos();

  const [cantidad, setCantidad] = useState(1);

  // La hora se elige con dos desplegables en vez de un DateTimePicker.
  // react-native-web no implementa ese componente, asi que en el navegador
  // tocar el campo no abria nada.
  const [hora, setHora] = useState(8);
  const [minuto, setMinuto] = useState(0);

  const [semanas, setSemanas] = useState(4);

  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [pastillaSel, setPastillaSel] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Sin esto, la lista arranca vacia y la pantalla mostraba "todavia no hay
  // ninguna pastilla cargada" durante el medio segundo que tarda la consulta,
  // aunque hubiera diez. Un vacio que despues se desmiente solo asusta.
  const [cargando, setCargando] = useState(true);

  // El desplegable se llena con las pastillas que ya se cargaron. Asi el
  // nombre nunca puede no coincidir, y de paso viene el stock del modulo, que
  // es lo que permite avisar si alcanza.
  useEffect(() => {
    getPastillas()
      .then((lista) => {
        setPastillas(lista);
        setPastillaSel((actual) => actual || lista[0]?.id || "");
      })
      .catch(() => setPastillas([]))
      .finally(() => setCargando(false));
  }, []);

  const seleccionada = pastillas.find((p) => p.id === pastillaSel);

  const fechas = useMemo(
    () =>
      diasSeleccionados.length
        ? fechasDeLaRutina(diasSeleccionados, semanas, hora, minuto)
        : [],
    [diasSeleccionados, semanas, hora, minuto]
  );

  const diasEnPalabras = diasSeleccionados.length
    ? ["L", "M", "X", "J", "V", "S", "D"]
        .filter((d) => diasSeleccionados.includes(d))
        .map((d) => NOMBRE_DIA[d])
        .join(", ")
    : "";

  const agendar = async () => {
    setError("");
    setExito("");

    if (!pastillaSel) {
      setError("Elegí una pastilla. Si no tenés ninguna, cargala primero.");
      return;
    }

    // Sin dias no hay rutina. Antes, con ninguno marcado, agendaba una dosis
    // suelta para hoy sin avisar, que no es lo que uno pide cuando deja los
    // siete dias sin tocar.
    if (!diasSeleccionados.length) {
      setError("Elegí al menos un día de la semana");
      return;
    }

    if (!fechas.length) {
      setError("No quedó ninguna fecha para agendar con esos días");
      return;
    }

    if (!seleccionada?.modulo) {
      const seguir = await confirmar(
        "Esta pastilla no está cargada en ningún módulo",
        `El pastillero no va a poder dispensarla hasta que la cargues.\n\n¿Querés agendarla igual?`,
        "Agendar igual"
      );
      if (!seguir) return;
    } else {
      const analisis = analizarStock({
        fechas,
        cantidadPorDosis: cantidad,
        stock: seleccionada.modulo.cantidad_actual,
      });

      if (!analisis.alcanza) {
        const seguir = await confirmar(
          "No te alcanzan las pastillas",
          `La rutina son ${analisis.totalDosis} dosis de ${cantidad}, o sea ${analisis.totalPastillas} pastillas en total. ` +
            `En el módulo ${seleccionada.modulo.numero} hay ${analisis.stock}.\n\n` +
            `Te alcanza para ${analisis.dosisCubiertas} dosis, hasta la semana ${analisis.semanasCubiertas}. ` +
            `Después vas a tener que recargar ${analisis.faltan} pastillas.\n\n` +
            `¿Agendo la rutina igual?`,
          "Agendar igual"
        );
        if (!seguir) return;
      }
    }

    setGuardando(true);
    try {
      const cuantas = await agendarPastilla({
        pastilla_id: pastillaSel,
        hora: `${dosDigitos(hora)}:${dosDigitos(minuto)}`,
        cantidad,
        dias: diasSeleccionados,
        semanas,
      });

      // Si hoy era uno de los dias elegidos pero la hora ya paso, la rutina
      // arranco la semana que viene. Conviene decirlo: si no, parece que no
      // agendo nada para hoy por error.
      const ahora = new Date();
      const hoyISO = `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
      const letraHoy = ["D", "L", "M", "X", "J", "V", "S"][ahora.getDay()];
      const seSalteoHoy = diasSeleccionados.includes(letraHoy) && fechas[0] !== hoyISO;

      const cuerpo =
        cuantas === 1
          ? "Se agendó la dosis"
          : `Se agendaron ${cuantas} dosis en ${semanas === 1 ? "1 semana" : `${semanas} semanas`}`;

      setExito(
        seSalteoHoy
          ? `${cuerpo}. Las ${dosDigitos(hora)}:${dosDigitos(minuto)} de hoy ya pasaron, así que arranca el ${comoFecha(fechas[0])}.`
          : `${cuerpo}. Arranca el ${comoFecha(fechas[0])}.`
      );

      // Se deja ver el mensaje antes de volver a la pantalla anterior.
      setTimeout(() => router.back(), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Pantalla>
        <Encabezado titulo="Agendar una dosis" volverA="/medicacion" />
        <Cargando texto="Buscando las pastillas..." />
      </Pantalla>
    );
  }

  if (pastillas.length === 0) {
    return (
      <Pantalla>
        <Encabezado
          titulo="Agendar una dosis"
          bajada="Para agendar hace falta tener al menos una pastilla cargada."
          volverA="/medicacion"
        />

        <Vacio
          icono="medkit-outline"
          titulo="Todavía no hay ninguna pastilla cargada"
          detalle="Primero cargá el medicamento y decí cuántas pusiste en el módulo del pastillero."
          accion={{
            titulo: "Cargar una pastilla",
            onPress: () => router.push("/agregar-medicacion"),
          }}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Encabezado
        titulo="Agendar una dosis"
        bajada="Elegí qué pastilla, a qué hora y qué días de la semana."
        volverA="/medicacion"
      />

      <Aviso texto={error} />
      <Aviso texto={exito} tipo="ok" titulo="Agendado" />

      <Selector
        etiqueta="Qué pastilla"
        valor={pastillaSel}
        alCambiar={setPastillaSel}
        opciones={pastillas.map((p) => ({
          valor: p.id,
          etiqueta: p.modulo
            ? `${p.nombre} — quedan ${p.modulo.cantidad_actual}`
            : `${p.nombre} — sin módulo`,
        }))}
        ayuda={
          seleccionada?.modulo
            ? `Módulo ${seleccionada.modulo.numero}, con ${seleccionada.modulo.cantidad_actual} pastillas.`
            : "Esta pastilla no está en ningún módulo: el pastillero no va a poder dispensarla."
        }
      />

      <Contador
        etiqueta="Cuántas pastillas por dosis"
        valor={cantidad}
        alCambiar={setCantidad}
        minimo={1}
        maximo={20}
        enPalabras={(v) => (v === 1 ? "1 pastilla" : `${v} pastillas`)}
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

      <SelectorDias
        etiqueta="Qué días de la semana"
        seleccionados={diasSeleccionados}
        alCambiar={setDiasSeleccionados}
      />

      <Contador
        etiqueta="Cuánto tiempo dura"
        valor={semanas}
        alCambiar={setSemanas}
        minimo={1}
        maximo={52}
        enPalabras={(v) => (v === 1 ? "1 semana" : `${v} semanas`)}
      />

      {/* EL RESUMEN
          Lo que se va a crear, escrito como lo diría una persona. Es la última
          oportunidad de darse cuenta de que dice "20:00" donde uno quiso poner
          "08:00". */}
      <View style={styles.resumen} accessibilityLiveRegion="polite">
        <Text style={styles.resumenTitulo}>Vas a agendar</Text>

        {diasSeleccionados.length === 0 ? (
          <Text style={styles.resumenTexto}>
            Falta elegir los días de la semana.
          </Text>
        ) : (
          <>
            <Text style={styles.resumenTexto}>
              <Text style={styles.resumenFuerte}>
                {seleccionada?.nombre ?? "La pastilla"}
              </Text>
              , {cantidad === 1 ? "1 pastilla" : `${cantidad} pastillas`} por dosis,{" "}
              los {diasEnPalabras} a las {dosDigitos(hora)}:{dosDigitos(minuto)},
              durante {semanas === 1 ? "1 semana" : `${semanas} semanas`}.
            </Text>

            <Text style={styles.resumenTotal}>
              Son {fechas.length} {fechas.length === 1 ? "dosis" : "dosis"} en total
              {fechas.length > 0 && `, desde el ${comoFecha(fechas[0])}`}.
            </Text>
          </>
        )}
      </View>

      <Boton
        titulo={guardando ? "Agendando..." : "Agendar"}
        onPress={agendar}
        cargando={guardando}
        deshabilitado={diasSeleccionados.length === 0}
        ayuda="Se crean todas las dosis de la rutina de una vez"
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

  resumen: {
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.lg,
  },

  resumenTitulo: {
    ...texto.etiqueta,
    color: colores.acentoSuave,
    marginBottom: espacio.sm,
  },

  resumenTexto: {
    ...texto.cuerpo,
    color: colores.texto,
  },

  resumenFuerte: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
  },

  resumenTotal: {
    ...texto.cuerpoFuerte,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },
}));
