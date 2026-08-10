import React, { useState } from "react";
import { router } from "expo-router";
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import LavaBackground from "../components/LavaBackground";
import { agendarPastilla } from "../lib/voitos";

export default function AgregarMedicacion() {
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [hora, setHora] = useState("");
  const [mostrarHora, setMostrarHora] = useState(false);

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

      <View style={styles.content}>

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


        <TextInput
          style={styles.input}
          placeholder="Nombre del medicamento"
          placeholderTextColor="#999"
          value={nombre}
          onChangeText={setNombre}
        />


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


        <TouchableOpacity
          style={styles.input}
          onPress={() => setMostrarHora(true)}
        >

          <Text
            style={{
              color: hora ? "#000" : "#999",
              fontSize: 17,
            }}
          >
            {hora || "Seleccionar hora"}
          </Text>

        </TouchableOpacity>


        {mostrarHora && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {

              setMostrarHora(false);

              if (selectedDate) {

                const horas = selectedDate
                  .getHours()
                  .toString()
                  .padStart(2, "0");

                const minutos = selectedDate
                  .getMinutes()
                  .toString()
                  .padStart(2, "0");


                setHora(`${horas}:${minutos}`);
              }

            }}
          />
        )}



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



        <TouchableOpacity
          style={styles.addButton}
          onPress={async () => {

            if (!nombre || !hora) {
              Alert.alert("Faltan datos", "Poner el nombre de la pastilla y la hora");
              return;
            }

            try {
              const cuantas = await agendarPastilla({
                nombrePastilla: nombre,
                hora,
                cantidad,
                dias: diasSeleccionados,
              });

              Alert.alert(
                "Listo",
                cuantas === 1
                  ? "Se agendo la dosis"
                  : `Se agendaron ${cuantas} dosis para las proximas 4 semanas`
              );

              router.back();
            } catch (e: any) {
              Alert.alert("No se pudo agendar", e.message);
            }

          }}
        >

          <Text style={styles.addButtonText}>
            AGENDAR
          </Text>

        </TouchableOpacity>


      </View>

    </View>
  );
}



const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#000",
  },


  content: {
  flex: 1,
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