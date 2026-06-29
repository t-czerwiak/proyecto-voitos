import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
} from "react-native";

export default function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/logoClaro.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="NOMBRE...."
          placeholderTextColor="#B3B3B3"
          value={nombre}
          onChangeText={setNombre}
        />

        <TextInput
          style={styles.input}
          placeholder="APELLIDO...."
          placeholderTextColor="#B3B3B3"
          value={apellido}
          onChangeText={setApellido}
        />

       

        <TextInput
          style={styles.input}
          placeholder="CONTRASEÑA...."
          placeholderTextColor="#B3B3B3"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 25,
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
    width: "92%",
    height: 58,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 18,
    fontSize: 18,
    color: "#000",

    shadowColor: "#FFFFFF",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },

  button: {
    width: 280,
    height: 66,
    backgroundColor: "#004E1E",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#098B03",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 15,
    marginBottom: 30,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
});