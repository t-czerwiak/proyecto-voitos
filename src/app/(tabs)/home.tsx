import { View, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import MenuCard from "../../components/MenuCard";
import LavaBackground from "../../components/LavaBackground";

export default function Menu() {
  return (
    <View style={styles.container}>

      {/* Fondo animado */}
      <LavaBackground />

      {/* Contenido */}
      <View style={styles.content}>
        <Text style={styles.title}>
          MENÚ
        </Text>

        <MenuCard
          title="CALENDARIO"
          image={require("../../../assets/images/calendario.jpg")}
          onPress={() => router.push("/calendario")}
        />

        <MenuCard
          title="PASTILLAS"
          image={require("../../../assets/images/pastillas.jpg")}
          onPress={() => router.push("/medicacion")}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1, // Hace que el contenido quede por encima del fondo
    
  },

  title: {
    color: "white",
    fontSize: 45,
    fontWeight: "900",
    marginBottom: 40,
  },
});