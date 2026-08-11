import { Alert, Platform } from "react-native";

// Muestra un aviso al usuario.
//
// OJO con usar Alert.alert directo: en react-native-web esta implementado como
// una funcion vacia (class Alert { static alert() {} }), asi que en el
// navegador NO muestra nada y los errores se pierden en silencio.
//
// Por eso en web se usa window.alert, que es el equivalente mas cercano y no
// obliga a agregar nada al diseno de las pantallas.
export const avisar = (titulo: string, mensaje?: string) => {
  const texto = mensaje ? `${titulo}\n\n${mensaje}` : titulo;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(texto);
    } else {
      console.warn(texto);
    }
    return;
  }

  Alert.alert(titulo, mensaje);
};
