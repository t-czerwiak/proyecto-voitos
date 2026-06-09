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
    alignItems: 'center',
    justifyContent: 'center'
  },


    loginButton: {
      backgroundColor: '#004d1a', 
     borderWidth: 2,
     borderColor: '#ffffff', 
     paddingVertical: 16,
     paddingHorizontal: 40,
     borderRadius: 12,
     alignItems: 'center',
     justifyContent: 'center',
     minWidth: 280,
     
     shadowColor: '#00FF66',
     shadowOffset: { width: 0, height: 0 },
     shadowOpacity: 0.8,
     shadowRadius: 15,
     elevation: 10,
    
     boxShadow: '0 0 20px #00FF66',
    },
    

   loginButtonHover: {
    backgroundColor: "#098B03",
  },

  loginButtonText: {
    fontFamily: "Nunito_700Bold",
    color: "#FFFFFF",
    fontSize: 20,
    
    
  },

  createAccountText: {
    fontFamily: "Nunito_400Regular",
    color: "#FFFFFF",
    fontSize: 18,
    marginTop: 25,
    
  },

 
   
        
  
  
  
});