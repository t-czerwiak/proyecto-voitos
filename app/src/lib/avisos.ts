import { Alert } from "react-native";

// Avisos y confirmaciones que funcionan en las dos plataformas.
//
// react-native-web no implementa Alert: en el navegador Alert.alert no muestra
// nada y el codigo sigue de largo como si el usuario hubiera aceptado. Como la
// app hoy se usa desde el navegador del celular, se usa el dialogo del browser
// cuando existe y se cae a Alert solo en nativo.

const enNavegador = typeof window !== "undefined" && typeof window.confirm === "function";

export const avisar = (titulo: string, mensaje: string): void => {
  if (enNavegador) {
    window.alert(`${titulo}\n\n${mensaje}`);
    return;
  }
  Alert.alert(titulo, mensaje);
};

// Devuelve true si la persona confirmo. En nativo se resuelve por callback,
// por eso la promesa.
export const confirmar = (
  titulo: string,
  mensaje: string,
  textoOk = "Continuar"
): Promise<boolean> => {
  if (enNavegador) {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }

  return new Promise((resolver) => {
    Alert.alert(titulo, mensaje, [
      { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
      { text: textoOk, onPress: () => resolver(true) },
    ]);
  });
};
