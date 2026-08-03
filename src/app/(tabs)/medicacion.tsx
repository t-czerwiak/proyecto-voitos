import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router"; // 👈 Added missing import
import LavaBackground from "../../components/LavaBackground";

export default function Medicacion() {
  return (
    <View style={styles.container}>
      <LavaBackground />

      <View style={styles.content}>
        <Text style={styles.title}>
          PAST<Text style={styles.i}>I</Text>LLAS
        </Text>

        {/* 👈 Fixed onPress placement inside the opening tag */}
        <Pressable 
          style={styles.button} 
          onPress={() => router.push("/agregar-medicacion")}
        >
          <Text style={styles.buttonText}>AGREGAR</Text>
          <Ionicons name="add" size={38} color="white" />
        </Pressable>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>AGENDAR</Text>
          <Ionicons name="calendar-outline" size={34} color="white" />
        </Pressable>
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
    paddingTop: 70,
  },

  title: {
    fontSize: 58,
    color: "#FFF",
    fontFamily: "Nunito_700Bold",
    marginBottom: 170,
  },

  i: {
    color: "#098B03",
  },

  button: {
    width: 400,
    height: 72,
    backgroundColor: "#0B5A19",

    borderWidth: 3,
    borderColor: "#FFF",
    borderRadius: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 24,
    marginBottom: 30,

    shadowColor: "#00FF55",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },

  buttonText: {
    flex: 1,
    textAlign: "center",
    color: "#FFF",
    fontSize: 26,
    fontFamily: "Nunito_700Bold",
  },
});