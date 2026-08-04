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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

// --- COMPONENTE DE LAS MANCHAS DE LAVA ---
const LavaBlob = ({ size, color, duration, initialX, initialY }) => {
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

  const handleAgregar = () => {
    // Lógica para agregar la pastilla
    console.log({ nombre, tipo, cantidad });
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
      <View style={styles.contentLayer}>
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

        <TouchableOpacity style={styles.button} onPress={handleAgregar}>
          <Text style={styles.buttonText}>AGREGAR</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentLayer: {
    flex: 1,
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

  pickerContainer: {
    backgroundColor: "#fff",
    width: "85%",
    maxWidth: 400,
    height: 50,
    borderRadius: 10,
    marginVertical: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },

  picker: {
    width: "100%",
    color: "#000",
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

  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
});