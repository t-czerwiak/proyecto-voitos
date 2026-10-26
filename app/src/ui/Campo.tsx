import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;

  ayuda?: string;
  error?: string;
  secreto?: boolean;
  teclado?: KeyboardTypeOptions;
  autoCompletar?: TextInputProps["autoComplete"];
  placeholder?: string;
};

export default function Campo({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  error,
  secreto = false,
  teclado,
  autoCompletar,
  placeholder,
}: Props) {
  const styles = useEstilos();
  const colores = useColores();

  const [enfocado, setEnfocado] = useState(false);
  const hayError = Boolean(error);

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <TextInput
        style={[
          styles.campo,
          enfocado && styles.campoEnfocado,
          hayError && styles.campoConError,
        ]}
        value={valor}
        onChangeText={alCambiar}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        secureTextEntry={secreto}
        keyboardType={teclado}
        autoComplete={autoCompletar}
        autoCapitalize={teclado === "email-address" ? "none" : "sentences"}
        placeholder={placeholder}
        placeholderTextColor={colores.textoTenue}

        accessibilityLabel={etiqueta}
        accessibilityHint={hayError ? `${ayuda ?? ""} ${error}`.trim() : ayuda}
      />

      {ayuda && !hayError && <Text style={styles.ayuda}>{ayuda}</Text>}

      {hayError && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    marginBottom: espacio.lg,
  },

  etiqueta: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  campo: {
    minHeight: toque.comodo,
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,

    ...texto.cuerpo,
    color: colores.texto,
  },

  campoEnfocado: {
    borderColor: colores.acento,
  },

  campoConError: {
    borderColor: colores.peligro.solido,
  },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.xs,
  },

  error: {
    ...texto.dato,
    color: colores.peligro.texto,
    marginTop: espacio.xs,
  },
}));
