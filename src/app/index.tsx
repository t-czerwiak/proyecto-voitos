import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.loginButton}>
          <Text style={styles.loginButtonText}>
            INICIO DE SESIÓN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.createAccountText}>
            Crear cuenta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 100,
    paddingBottom: 120,
  },

  logo: {
    width: 260,
    height: 120,
  },

  bottomContainer: {
    alignItems: "center",
    width: "100%",
  },

  loginButton: {
    backgroundColor: "#004E1E",
    width: 280,
    height: 60,
    borderRadius: 15,
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
    shadowRadius: 15,
    elevation: 10,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  createAccountText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 25,
  },
});