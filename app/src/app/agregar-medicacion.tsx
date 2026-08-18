import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { crearPastilla, getPastillas, ajustarStock, Pastilla } from "../lib/voitos";
import Mensaje from "../components/Mensaje";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

type LavaBlobProps = {
  size: number;
  color: string;
  duration: number;
  initialX: number;
  initialY: number;
};

// --- COMPONENTE DE LAS MANCHAS DE LAVA ---
const LavaBlob = ({ size, color, duration, initialX, initialY }: LavaBlobProps) => {
  const posX = useSharedValue(initialX);
  const posY = useSharedValue(initialY);
  const rotation = useSharedValue(0);

  useEffect(() => {
    posX.value = withRepeat(
      withTiming(Math.random() * width, {
        duration: duration + 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    posY.value = withRepeat(
      withTiming(Math.random() * height, {
        duration: duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: duration + 5000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value - size / 2 },
      { translateY: posY.value - size / 2 },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size * 0.9,
          borderTopLeftRadius: size * 0.45,
          borderTopRightRadius: size * 0.55,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.4,
          backgroundColor: color,
          opacity: 0.12,
          shadowColor: color,
          shadowRadius: 65,
          shadowOpacity: 1,
          elevation: 20,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("chico");
  const [cantidad, setCantidad] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // Pastillas que ya existen, para poder recargarles el modulo sin crearlas
  // de nuevo. Se recargan despues de cada cambio asi el stock que se ve es el
  // que quedo en la base.
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [pastillaSel, setPastillaSel] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [ajustando, setAjustando] = useState(false);

  const cargarPastillas = () => {
    getPastillas()
      .then((lista) => {
        setPastillas(lista);
        setPastillaSel((actual) => actual || lista[0]?.id || "");
      })
      .catch(() => setPastillas([]));
  };

  useEffect(cargarPastillas, []);

  const seleccionada = pastillas.find((p) => p.id === pastillaSel);

  const handleAjustar = async (signo: 1 | -1) => {
    setError("");
    setExito("");

    const cuantas = Number(ajuste);
    if (!pastillaSel) {
      setError("Elegí una pastilla");
      return;
    }
    if (!Number.isInteger(cuantas) || cuantas <= 0) {
      setError("Poné cuántas pastillas sumar o restar");
      return;
    }

    setAjustando(true);
    try {
      const modulo = await ajustarStock(pastillaSel, signo * cuantas);
      setExito(
        `Módulo ${modulo.numero}: quedan ${modulo.cantidad_actual} pastillas`
      );
      setAjuste("");
      cargarPastillas();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAjustando(false);
    }
  };

  const handleAgregar = async () => {
    setError("");
    setExito("");

    if (!nombre) {
      setError("Poné el nombre de la pastilla");
      return;
    }

    setGuardando(true);
    try {
      // La cantidad son las pastillas que se cargan en el modulo fisico. Va
      // como cantidad_inicial y no dentro de "caracteristicas": de ahi sale el
      // stock que despues se descuenta y que avisa si alcanza para la rutina.
      const creada = await crearPastilla({
        nombre,
        tipo,
        cantidad_inicial: cantidad ? Number(cantidad) : 0,
      });

      setExito(
        creada.modulo
          ? `Se agregó ${nombre} en el módulo ${creada.modulo.numero} con ${creada.modulo.cantidad_actual}. Ya la podés agendar.`
          : `Se agregó ${nombre}. Ya la podés agendar.`
      );
      setNombre("");
      setCantidad("");
      cargarPastillas();

    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <LinearGradient
      colors={["#002b11", "#021108", "#000000"]}
      style={styles.container}
    >
      {/* Background Blobs */}
      <View style={StyleSheet.absoluteFill}>
        <LavaBlob size={320} color="#00FF7F" duration={12000} initialX={width * 0.2} initialY={height * 0.1} />
        <LavaBlob size={260} color="#90EE90" duration={15000} initialX={width * 0.7} initialY={height * 0.4} />
        <LavaBlob size={350} color="#32CD32" duration={18000} initialX={width * 0.4} initialY={height * 0.8} />
      </View>

      {/* Content Container */}
      <ScrollView contentContainerStyle={styles.contentLayer}>
        <Pressable onPress={() => router.push("/medicacion")}>
  <Image
    source={require("../../assets/images/logoClaro.png")}
    style={styles.logo}
    resizeMode="contain"
  />
</Pressable>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="PASTILLA...."
            placeholderTextColor="#B3B3B3"
            value={nombre}
            onChangeText={setNombre}
          />

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tipo}
              onValueChange={(itemValue) => setTipo(itemValue)}
              dropdownIconColor="#00FF7F"
              style={styles.picker}
            >
              <Picker.Item label="Chico" value="chico" />
              <Picker.Item label="Mediano" value="mediano" />
              <Picker.Item label="Grande" value="grande" />
              <Picker.Item label="Píldora" value="pildora" />
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="CANTIDAD...."
            placeholderTextColor="#B3B3B3"
            keyboardType="numeric"
            value={cantidad}
            onChangeText={setCantidad}
          />
        </View>

        <Mensaje texto={error} />
        <Mensaje texto={exito} tipo="ok" />

        <TouchableOpacity style={styles.button} onPress={handleAgregar} disabled={guardando}>
          <Text style={styles.buttonText}>{guardando ? "GUARDANDO..." : "AGREGAR"}</Text>
        </TouchableOpacity>

        {/* Recarga de una pastilla que ya existe. Va separado de crear porque
            es la operacion del dia a dia: la pastilla se crea una vez y se
            recarga muchas. */}
        {pastillas.length > 0 && (
          <View style={styles.form}>
            <Text style={styles.label}>RECARGAR UNA PASTILLA</Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={pastillaSel}
                onValueChange={(v) => setPastillaSel(v)}
                dropdownIconColor="#00FF7F"
                style={styles.picker}
              >
                {pastillas.map((p) => (
                  <Picker.Item
                    key={p.id}
                    label={
                      p.modulo
                        ? `${p.nombre} — módulo ${p.modulo.numero} (${p.modulo.cantidad_actual})`
                        : `${p.nombre} — sin módulo`
                    }
                    value={p.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.stockTexto}>
              {seleccionada?.modulo
                ? `Ahora hay ${seleccionada.modulo.cantidad_actual} en el módulo ${seleccionada.modulo.numero}`
                : "Esta pastilla no está cargada en ningún módulo"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="CUÁNTAS...."
              placeholderTextColor="#B3B3B3"
              keyboardType="numeric"
              value={ajuste}
              onChangeText={setAjuste}
            />

            <View style={styles.fila}>
              <TouchableOpacity
                style={[styles.button, styles.botonChico]}
                onPress={() => handleAjustar(1)}
                disabled={ajustando}
              >
                <Text style={styles.buttonText}>SUMAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.botonChico]}
                onPress={() => handleAjustar(-1)}
                disabled={ajustando}
              >
                <Text style={styles.buttonText}>RESTAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentLayer: {
    // flexGrow: es el contentContainerStyle de un ScrollView (ver arriba),
    // donde flex: 1 impediria el scroll al agregarse la seccion de recarga.
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 25,
    zIndex: 10,
  },

  logo: {
    width: 250,
    height: 140,
    marginTop: 25,
  },

  form: {
    width: "100%",
    alignItems: "center",
    gap: 22,
  },

  input: {
    backgroundColor: "#fff",
    width: "85%",
    maxWidth: 400,
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 20,
    fontSize: 16,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  picker: {
  width: 400,
  height: 50,
  backgroundColor: "#FFFFFF",
  borderRadius: 10,
  borderWidth: 0,
  paddingHorizontal: 20,
  marginVertical: 6,
  color: "#000000",

  shadowColor: "#00FF7F",
  shadowOffset: {
    width: 0,
    height: 5,
  },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 6,
},
  button: {
    width: 280,
    height: 66,
    backgroundColor: "#01250e",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#105a2c",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FF7F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
    marginBottom: 30,
  },

  // El JSX referencia styles.pickerContainer pero nunca se definio, asi que en
  // runtime era undefined y React Native lo ignoraba. Se deja vacio a proposito:
  // arregla el error de tipos sin cambiar como se ve hoy.
  pickerContainer: {},

  label: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 10,
  },

  stockTexto: {
    color: "#B3B3B3",
    fontSize: 14,
  },

  fila: {
    flexDirection: "row",
    gap: 16,
  },

  // Mismo boton que el de AGREGAR pero angosto, para que los dos entren en
  // una fila sin cambiar el aspecto.
  botonChico: {
    width: 132,
    height: 56,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
});