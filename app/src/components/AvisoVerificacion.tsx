import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  reenviarVerificacion,
} from "../lib/voitos";
import { Boton } from "../ui";
import { colores, espacio, radio, texto } from "../tema";

// Aviso de cuenta sin verificar.
//
// NO bloquea nada a proposito. La cuenta funciona igual: se puede agregar
// pastillas, agendar y ver el calendario sin haber confirmado el mail. El
// aviso esta para que la persona sepa que le falta un paso, no para trabarla.
//
// Lo que cambio del diseno anterior: el texto pasó de 13px a 17, y las dos
// acciones dejaron de ser texto suelto de 13px —"Reenviar el mail", "Ahora
// no"— para ser botones de 48px. Eran las dos cosas mas chicas de la pantalla
// y habia que acertarles con el dedo.
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
    <View style={styles.caja} accessibilityLiveRegion="polite">
      <View style={styles.titulo}>
        <Ionicons name="mail-unread" size={22} color={colores.atencion.texto} />
        <Text style={styles.tituloTexto}>Falta confirmar tu cuenta</Text>
      </View>

      <Text style={styles.cuerpo}>
        Te mandamos un mail con un enlace. Podés usar la app igual, pero hasta
        confirmarla no te van a llegar los avisos del pastillero.
      </Text>

      {mensaje !== "" && <Text style={styles.respuesta}>{mensaje}</Text>}

      <View style={styles.acciones}>
        <Boton
          titulo={enviando ? "Enviando..." : "Reenviar el mail"}
          variante="secundario"
          onPress={handleReenviar}
          cargando={enviando}
          ancho="auto"
        />

        <Boton
          titulo="Ahora no"
          variante="enlace"
          onPress={() => setOculto(true)}
          ancho="auto"
          ayuda="Oculta este aviso hasta la próxima vez que entres"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    width: "100%",
    backgroundColor: colores.atencion.fondo,
    borderWidth: 2,
    borderColor: colores.atencion.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.xl,
  },

  titulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
    marginBottom: espacio.sm,
  },

  tituloTexto: {
    ...texto.item,
    color: colores.atencion.texto,
    flex: 1,
  },

  cuerpo: {
    ...texto.cuerpo,
    color: colores.atencion.texto,
  },

  respuesta: {
    ...texto.cuerpoFuerte,
    color: colores.atencion.texto,
    marginTop: espacio.md,
  },

  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.lg,
  },
});
