import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  reenviarVerificacion,
} from "../lib/voitos";
import { Boton } from "../ui";
import { crearEstilos, useColores, espacio, radio, texto } from "../tema";

export default function AvisoVerificacion() {
  const styles = useEstilos();
  const colores = useColores();

  const [verificado, setVerificado] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [oculto, setOculto] = useState(false);

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
        Abrí el enlace que te mandamos por mail para recibir los avisos del
        pastillero.
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

const useEstilos = crearEstilos((colores) => ({
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
}));
