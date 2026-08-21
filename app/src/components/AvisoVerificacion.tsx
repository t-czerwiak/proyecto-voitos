import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  reenviarVerificacion,
} from "../lib/voitos";

// Aviso de cuenta sin verificar.
//
// NO bloquea nada a proposito. La cuenta funciona igual: se puede agregar
// pastillas, agendar y ver el calendario sin haber confirmado el mail. El
// aviso esta para que la persona sepa que le falta un paso, no para trabarla.
//
// Se pone al tope de las pantallas principales. Cuando la cuenta se verifica,
// desaparece solo.
export default function AvisoVerificacion() {
  const [verificado, setVerificado] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [oculto, setOculto] = useState(false);

  // Se relee al entrar a la pantalla, no una sola vez al montar.
  //
  // El objeto de la sesion se escribe al iniciar sesion y no se entera de nada
  // despues. Si alguien verifica su cuenta desde el mail sin cerrar sesion, sin
  // esto el aviso seguiria apareciendo para siempre.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      const guardado = getUsuarioActual();
      if (guardado) setVerificado(guardado.verificado ?? false);

      refrescarUsuario()
        .then((u) => {
          if (vigente && u) setVerificado(u.verificado ?? false);
        })
        .catch(() => {
          // Sin sesion o sin backend: no se muestra nada. Un aviso de
          // verificacion no es el lugar para reportar que el backend no anda.
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  if (verificado !== false || oculto) return null;

  const handleReenviar = async () => {
    setMensaje("");
    setEnviando(true);
    try {
      const r = await reenviarVerificacion();
      setMensaje(`Te lo mandamos a ${r.mail}. Revisá también el spam.`);
    } catch (e: any) {
      setMensaje(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.caja}>
      <View style={styles.franja} />

      <View style={styles.contenido}>
        <Text style={styles.titulo}>Falta confirmar tu cuenta</Text>

        <Text style={styles.texto}>
          Te mandamos un mail con un enlace. Mientras tanto podés usar la app
          normalmente, pero confirmala para no perder los avisos del pastillero.
        </Text>

        {mensaje !== "" && <Text style={styles.respuesta}>{mensaje}</Text>}

        <View style={styles.acciones}>
          <Pressable onPress={handleReenviar} disabled={enviando}>
            <Text style={styles.enlace}>
              {enviando ? "Enviando..." : "Reenviar el mail"}
            </Text>
          </Pressable>

          <Pressable onPress={() => setOculto(true)}>
            <Text style={styles.enlaceSuave}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: "row",
    width: "90%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: "#2A2005",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7A5C12",
    overflow: "hidden",
    marginBottom: 18,
  },

  // Franja ambar al costado, el mismo recurso que usan los mails para el
  // estado: el color como acento y no como fondo del texto.
  franja: {
    width: 5,
    backgroundColor: "#E0A82E",
  },

  contenido: {
    flex: 1,
    padding: 16,
  },

  titulo: {
    color: "#F2D08A",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },

  texto: {
    color: "#D8C9A6",
    fontSize: 13,
    lineHeight: 19,
  },

  respuesta: {
    color: "#F2D08A",
    fontSize: 13,
    marginTop: 10,
  },

  acciones: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },

  enlace: {
    color: "#E0A82E",
    fontSize: 13,
    fontWeight: "800",
  },

  enlaceSuave: {
    color: "#9A8A66",
    fontSize: 13,
  },
});
