import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colores, espacio, radio, texto, toque } from "../tema";

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  // Debajo del campo, siempre visible. No es un placeholder: la ayuda que
  // desaparece cuando empezas a escribir es ayuda que no estuvo cuando hacia
  // falta.
  ayuda?: string;
  error?: string;
  secreto?: boolean;
  teclado?: KeyboardTypeOptions;
  autoCompletar?: TextInputProps["autoComplete"];
  placeholder?: string;
};

// Un campo de texto con su etiqueta arriba, escrita, siempre.
//
// El diseno anterior usaba el placeholder como etiqueta ("MAIL.....",
// "CONTRASEÑA...."). Eso falla de tres maneras a la vez: apenas escribis algo
// ya no sabes que campo era, el gris claro sobre blanco no llega al contraste
// minimo, y un lector de pantalla no siempre anuncia el placeholder. La
// etiqueta arriba arregla las tres.
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
        // El campo se anuncia con su etiqueta y, si hay error, con el error
        // pegado atras. Si no, el lector dice "campo de texto" a secas y la
        // persona no sabe cual de los cinco es.
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

const styles = StyleSheet.create({
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
    // 17px y no 16: por debajo de 16 los navegadores de iOS hacen zoom solos
    // al enfocar un campo, y la pantalla queda corrida.
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
});
