import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";


import LavaBackground from "../components/LavaBackground";
import {
  agendarPastilla,
  analizarStock,
  fechasDeLaRutina,
  getPastillas,
  Pastilla,
} from "../lib/voitos";
import { confirmar } from "../lib/avisos";
import Mensaje from "../components/Mensaje";

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);
const dosDigitos = (n: number) => String(n).padStart(2, "0");

export default function AgregarMedicacion() {
  const [cantidad, setCantidad] = useState(1);

  // La hora se elige con dos desplegables en vez de un DateTimePicker.
  // react-native-web no implementa ese componente, asi que en el navegador
  // tocar el campo no abria nada: ese era el input roto.
  const [hora, setHora] = useState(8);
  const [minuto, setMinuto] = useState(0);

  // Cuantas semanas dura la rutina. Antes estaba fijo en 4 adentro de la
  // logica, sin forma de elegirlo.
  const [semanas, setSemanas] = useState(4);

  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [pastillaSel, setPastillaSel] = useState("");

  const diasSemana = [
    "L",
    "M",
    "X",
    "J",
    "V",
    "S",
    "D",
  ];

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);

  // El desplegable se llena con las pastillas que ya se cargaron desde
  // AGREGAR. Asi el nombre nunca puede no coincidir, y de paso viene el stock
  // del modulo, que es lo que permite avisar si alcanza.
  useEffect(() => {
    getPastillas()
      .then((lista) => {
        setPastillas(lista);
        setPastillaSel((actual) => actual || lista[0]?.id || "");
      })
      .catch(() => setPastillas([]));
  }, []);

  const seleccionada = pastillas.find((p) => p.id === pastillaSel);

  function cambiarDia(dia: string) {
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

  return (
    <View style={styles.container}>

      <LavaBackground />

      <ScrollView contentContainerStyle={styles.content}>

        <Pressable onPress={() => router.back()}>
          <Image
            source={require("../../assets/images/logoClaro.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>


        <Text style={styles.title}>
          AGENDAR MEDICACIÓN
        </Text>


        <View style={styles.input}>
          <Picker
            selectedValue={pastillaSel}
            onValueChange={(v) => setPastillaSel(v)}
            style={styles.picker}
          >
            {pastillas.length === 0 && (
              <Picker.Item label="No tenés pastillas cargadas" value="" />
            )}
            {pastillas.map((p) => (
              <Picker.Item
                key={p.id}
                label={
                  p.modulo
                    ? `${p.nombre} (${p.modulo.cantidad_actual} disponibles)`
                    : `${p.nombre} (sin módulo)`
                }
                value={p.id}
              />
            ))}
          </Picker>
        </View>


        <Text style={styles.label}>
          Cantidad por dosis
        </Text>


        <View style={styles.counterContainer}>

          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => {
              if (cantidad > 1) {
                setCantidad(cantidad - 1);
              }
            }}
          >
            <Text style={styles.counterButtonText}>
              −
            </Text>
          </TouchableOpacity>


          <Text style={styles.counterNumber}>
            {cantidad}
          </Text>


          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setCantidad(cantidad + 1)}
          >
            <Text style={styles.counterButtonText}>
              +
            </Text>
          </TouchableOpacity>

        </View>


        <Text style={styles.label}>
          Hora
        </Text>


        <View style={styles.horaFila}>
          <View style={[styles.input, styles.horaCampo]}>
            <Picker
              selectedValue={hora}
              onValueChange={(v) => setHora(Number(v))}
              style={styles.picker}
            >
              {HORAS.map((h) => (
                <Picker.Item key={h} label={dosDigitos(h)} value={h} />
              ))}
            </Picker>
          </View>

          <Text style={styles.horaSeparador}>:</Text>

          <View style={[styles.input, styles.horaCampo]}>
            <Picker
              selectedValue={minuto}
              onValueChange={(v) => setMinuto(Number(v))}
              style={styles.picker}
            >
              {MINUTOS.map((m) => (
                <Picker.Item key={m} label={dosDigitos(m)} value={m} />
              ))}
            </Picker>
          </View>
        </View>



        <Text style={styles.label}>
          Días de la semana
        </Text>


        <View style={styles.daysContainer}>

          {diasSemana.map((dia) => (

            <TouchableOpacity
              key={dia}
              style={[
                styles.dayButton,
                diasSeleccionados.includes(dia) &&
                  styles.dayButtonSelected,
              ]}
              onPress={() => cambiarDia(dia)}
            >

              <Text
                style={[
                  styles.dayText,
                  diasSeleccionados.includes(dia) &&
                    styles.dayTextSelected,
                ]}
              >
                {dia}
              </Text>

            </TouchableOpacity>

          ))}

        </View>



        <Text style={styles.label}>
          Duración de la rutina
        </Text>


        <View style={[styles.counterContainer, styles.counterAncho]}>

          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => {
              if (semanas > 1) {
                setSemanas(semanas - 1);
              }
            }}
          >
            <Text style={styles.counterButtonText}>
              −
            </Text>
          </TouchableOpacity>


          <Text style={styles.counterNumber}>
            {semanas === 1 ? "1 semana" : `${semanas} semanas`}
          </Text>


          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => setSemanas(semanas + 1)}
          >
            <Text style={styles.counterButtonText}>
              +
            </Text>
          </TouchableOpacity>

        </View>


        <Mensaje texto={error} />
        <Mensaje texto={exito} tipo="ok" />

        <TouchableOpacity
          style={styles.addButton}
          disabled={guardando}
          onPress={async () => {

            setError("");
            setExito("");

            if (!pastillaSel) {
              setError("Elegí una pastilla. Si no tenés ninguna, cargala desde AGREGAR.");
              return;
            }

            // Sin dias no hay rutina. Antes, con ninguno marcado, agendaba
            // una dosis suelta para hoy sin avisar, que no es lo que uno pide
            // cuando deja los siete dias sin tocar.
            if (!diasSeleccionados.length) {
              setError("Elegí al menos un día de la semana");
              return;
            }

            // Las fechas se calculan aca y no adentro de agendarPastilla
            // porque hacen falta antes, para poder contar cuantas pastillas
            // consume la rutina y avisar ANTES de crear 24 filas.
            //
            // Se pasan hora y minuto para que, si hoy es uno de los dias
            // elegidos pero la hora ya paso, la rutina arranque la semana que
            // viene en vez de nacer con una dosis vencida.
            const fechas = fechasDeLaRutina(
              diasSeleccionados,
              semanas,
              hora,
              minuto
            );

            if (!fechas.length) {
              setError("No quedó ninguna fecha para agendar con esos días");
              return;
            }

            if (!seleccionada?.modulo) {
              const seguir = await confirmar(
                "Esta pastilla no está cargada en ningún módulo",
                `El pastillero no va a poder dispensarla hasta que la cargues desde AGREGAR.

¿Querés agendarla igual?`,
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
                    `En el módulo ${seleccionada.modulo.numero} hay ${analisis.stock}.

` +
                    `Te alcanza para ${analisis.dosisCubiertas} dosis, hasta la semana ${analisis.semanasCubiertas}. ` +
                    `Después vas a tener que recargar ${analisis.faltan} pastillas.

` +
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

              // Si hoy era uno de los dias elegidos pero la hora ya paso, la
              // rutina arranco la semana que viene. Conviene decirlo: si no,
              // parece que no agendo nada para hoy por error.
              const ahora = new Date();
              const hoyISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
              const letraHoy = ["D", "L", "M", "X", "J", "V", "S"][ahora.getDay()];
              const seSalteoHoy =
                diasSeleccionados.includes(letraHoy) && fechas[0] !== hoyISO;

              const cuerpo =
                cuantas === 1
                  ? "Se agendó la dosis"
                  : `Se agendaron ${cuantas} dosis en ${semanas === 1 ? "1 semana" : semanas + " semanas"}`;

              setExito(
                seSalteoHoy
                  ? `${cuerpo}. Las ${dosDigitos(hora)}:${dosDigitos(minuto)} de hoy ya pasaron, así que arranca el ${fechas[0].split("-").reverse().join("/")}.`
                  : `${cuerpo}. Arranca el ${fechas[0].split("-").reverse().join("/")}.`
              );

              // Se deja ver el mensaje antes de volver a la pantalla anterior
              setTimeout(() => router.back(), 3000);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setGuardando(false);
            }

          }}
        >

          <Text style={styles.addButtonText}>
            {guardando ? "AGENDANDO..." : "AGENDAR"}
          </Text>

        </TouchableOpacity>


      </ScrollView>

    </View>
  );
}



const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#000",
  },


  content: {
  // flexGrow y no flex: como contentContainerStyle de un ScrollView, flex: 1
  // fija la altura al viewport y el contenido deja de poder scrollear.
  flexGrow: 1,
  alignItems: "center",
  paddingHorizontal: 25,
  paddingTop: 35,
  zIndex: 1,
},

  logo: {
  width: 160,
  height: 80,
  marginBottom: 5,
},

  title: {
  color: "#FFFFFF",
  fontSize: 26,
  fontWeight: "900",
  letterSpacing: 2,
  marginBottom: 20,
},

  input: {
  width: "80%", 
  maxWidth: 450,
  height: 50, 
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  paddingHorizontal: 20,
  justifyContent: "center",

  fontSize: 16,
  marginVertical: 6,

  shadowColor: "#00FF7F",
  shadowOffset: {
    width: 0,
    height: 5,
  },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 6,
},

  // El Picker va adentro de styles.input para que herede la caja blanca
  // redondeada del resto de los campos y la pantalla no cambie de aspecto.
  picker: {
  width: "100%",
  borderWidth: 0,
  backgroundColor: "transparent",
  color: "#000000",
  fontSize: 16,
},

  horaFila: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "80%",
  maxWidth: 450,
},

  horaCampo: {
  width: 110,
},

  horaSeparador: {
  color: "#FFFFFF",
  fontSize: 24,
  fontWeight: "900",
},

  // El contador de semanas muestra texto ("4 semanas") y no un numero suelto,
  // asi que necesita mas ancho que el de cantidad.
  counterAncho: {
  width: 240,
},

  label: {
  width: "95%",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "800",
  textAlign: "center",
  marginTop: 12,
  marginBottom: 5,
  letterSpacing: 0.5,
},

  counterContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",

  width: 180,
  height: 55,

  backgroundColor: "#FFFFFF",
  borderRadius: 18,

  paddingHorizontal: 12,

  shadowColor: "#00FF7F",
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 5,
},

  counterButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#004E1E",
    justifyContent: "center",
    alignItems: "center",
  },


  counterButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },


  counterNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },


  daysContainer: {
  flexDirection: "row",
  justifyContent: "center",
  width: "100%",
  marginTop: 8,
},

  dayButton: {
  width: 38,
  height: 38,

  borderRadius: 19,

  marginHorizontal: 3,

  backgroundColor: "#002B12",

  borderWidth: 1.5,
  borderColor: "#00FF7F",

  justifyContent: "center",
  alignItems: "center",
},

 dayButtonSelected: {
  backgroundColor: "#00FF7F",

  transform:[
    {
      scale:1.1
    }
  ]
},

  dayText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },


  dayTextSelected: {
    color: "#000000",
  },


  addButton: {
  width: 280,
  height: 58,

  backgroundColor: "#00FF7F",

  borderRadius: 18,

  justifyContent:"center",
  alignItems:"center",

  marginTop:25,

  shadowColor:"#00FF7F",
  shadowOpacity:0.8,
  shadowRadius:15,
  elevation:10,
},

  addButtonText:{
  color:"#001A0A",
  justifyContent: "center",
  alignItems: "center",
  fontSize:19,
  fontWeight:"900",
  letterSpacing:2,
}
});