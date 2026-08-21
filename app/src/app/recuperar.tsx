import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Mensaje from "../components/Mensaje";
import { pedirRecuperacion, confirmarRecuperacion } from "../lib/voitos";

// Pantalla de recuperacion de contrasena. Hace las dos mitades del flujo segun
// haya token en la URL o no:
//
//   /recuperar               -> pide el mail y manda el enlace
//   /recuperar?token=abc123  -> pide la contrasena nueva
//
// Van juntas porque son el mismo trabajo visto desde los dos lados, y separarlas
// obligaria a mantener dos pantallas casi iguales.
export default function Recuperar() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const hayToken = Boolean(token);

  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const pedirEnlace = async () => {
    setError("");
    setAviso("");

    if (!mail.trim()) {
      setError("Escribí tu mail");
      return;
    }

    setCargando(true);
    try {
      const r = await pedirRecuperacion(mail);
      // El backend contesta lo mismo exista o no la cuenta, para no delatar
      // que casillas estan registradas. La pantalla dice lo mismo.
      setAviso(r.mensaje);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const guardarPassword = async () => {
    setError("");

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres");
      return;
    }

    // Se pide dos veces porque no hay forma de deshacerlo: si se equivoca al
    // tipear queda afuera de su cuenta y hay que empezar todo de nuevo.
    if (password !== repetida) {
      setError("Las dos contraseñas no coinciden");
      return;
    }

    setCargando(true);
    try {
      await confirmarRecuperacion(String(token), password);
      router.replace("/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={["#002b11", "#021108", "#000000"]} style={styles.container}>
      <View style={styles.contenido}>
        <Pressable onPress={() => router.push("/")}>
          <Image
            source={require("../../assets/images/logoClaro.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>

        <Text style={styles.titulo}>
          {hayToken ? "ELEGÍ TU CONTRASEÑA" : "RECUPERAR CONTRASEÑA"}
        </Text>

        <Text style={styles.bajada}>
          {hayToken
            ? "Escribila dos veces para asegurarnos de que no haya un error de tipeo."
            : "Escribí tu mail y te mandamos un enlace para elegir una contraseña nueva."}
        </Text>

        {hayToken ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="CONTRASEÑA NUEVA..."
              placeholderTextColor="#B3B3B3"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="REPETILA..."
              placeholderTextColor="#B3B3B3"
              secureTextEntry
              value={repetida}
              onChangeText={setRepetida}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="MAIL....."
              placeholderTextColor="#B3B3B3"
              autoCapitalize="none"
              keyboardType="email-address"
              value={mail}
              onChangeText={setMail}
            />
          </View>
        )}

        <Mensaje texto={error} />
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={hayToken ? guardarPassword : pedirEnlace}
          disabled={cargando}
        >
          <Text style={styles.buttonText}>
            {cargando
              ? "UN MOMENTO..."
              : hayToken
              ? "GUARDAR CONTRASEÑA"
              : "MANDARME EL ENLACE"}
          </Text>
        </TouchableOpacity>

        <Pressable onPress={() => router.replace("/Login")}>
          <Text style={styles.volver}>Volver a iniciar sesión</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  contenido: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    gap: 18,
  },

  logo: { width: 220, height: 120 },

  titulo: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },

  bajada: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
  },

  form: { width: "100%", alignItems: "center", gap: 16 },

  input: {
    backgroundColor: "#fff",
    width: "85%",
    maxWidth: 400,
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 20,
    fontSize: 16,
  },

  aviso: {
    color: "#9BE8B4",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
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
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  volver: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
