import { View, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import MenuCard from "../../components/MenuCard";

export default function Menu() {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        MENÚ
      </Text>

      <MenuCard
        title="CALENDARIO"
        image={require("../../assets/images/calendario.png")}
        onPress={() => router.push("/calendario")}
      />

      <MenuCard
        title="PASTILLAS"
        image={require("../../assets/images/pastillas.png")}
        onPress={() => router.push("/medicacion")}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "white",
    fontSize: 45,
    fontWeight: "900",
    marginBottom: 40,
  },
});