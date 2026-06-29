import React, { useState } from "react";
import { router } from "expo-router";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Pressable
} from "react-native";

export default function CrearCuenta() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.push("/")}>
           <Image
             source={require("../../../assets/images/logoClaro.png")}
             style={styles.logo}
             resizeMode="contain"
           />
           </Pressable>

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
          placeholder="MAIL....."
          placeholderTextColor="#B3B3B3"
          keyboardType="email-address"
          autoCapitalize="none"
          value={mail}
          onChangeText={setMail}
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
        <Text style={styles.buttonText}>CREAR CUENTA</Text>
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
      backgroundColor: '#fff',
      width: '85%',         
      maxWidth: 400,         
      height: 50,           
      borderRadius: 25,      
      paddingHorizontal: 20, 
      fontSize: 16,
      marginVertical: 10,

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