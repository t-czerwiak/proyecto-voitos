import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useState } from "react";

  export default function LoginScreen() {
    const [hover, setHover] = useState(false);
  
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logoClaro.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.bottomContainer}>
      <Pressable
  style={[
    styles.loginButton,
    hover && styles.loginButtonHover,
  ]}
    onHoverIn={() => setHover(true)}
    onHoverOut={() => setHover(false)}
>
  <Text style={styles.loginButtonText}>
    INICIO DE SESIÓN
  </Text>
</Pressable>
       

        <Pressable>
          <Text style={styles.createAccountText}>
            Crear cuenta
          </Text>
        </Pressable>
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
    width: 500,
    height: 215,
  },

  bottomContainer: {
    alignItems: "center",
    width: "100%",
  },


    loginButton: {
      backgroundColor: "#004E1E",
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: "center",
    },
    

   loginButtonHover: {
    backgroundColor: "#F5D7B2",
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