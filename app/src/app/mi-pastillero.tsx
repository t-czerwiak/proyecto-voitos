import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  getMisPastilleros,
  vincularPastillero,
  desvincularPastillero,
  renombrarPastillero,
  nombrePastillero,
  type PastilleroVinculado,
} from "../lib/voitos";
import { fechaConAnio } from "../lib/fechas";
import { confirmar } from "../lib/avisos";
import { Pantalla, Encabezado, Boton, Campo, Aviso, Estado, Cargando, Columnas, useEscritorio } from "../ui";
import { crearEstilos, useColores, espacio, radio, texto, fuentes } from "../tema";

const PASOS: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string }[] = [
  {
    icono: "wifi-outline",
    titulo: "Conectalo al WiFi",
    detalle: "Desde el celular, entrá a la red VOITOS y elegí la tuya. Es una sola vez.",
  },
  {
    icono: "keypad-outline",
    titulo: "Ingresá el código",
    detalle: "Son los 8 números que aparecen en su pantalla.",
  },
];

const horaDeAhora = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Dibujo({ chico = false }: { chico?: boolean }) {
  const styles = useEstilos();
  const [hora, setHora] = useState(horaDeAhora());

  useEffect(() => {
    const t = setInterval(() => setHora(horaDeAhora()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={[styles.aparato, chico && styles.aparatoChico]} accessible={false}>
      <View style={styles.pantallita}>
        <Text style={[styles.pantallitaHora, chico && styles.pantallitaHoraChica]}>{hora}</Text>
        <Text style={styles.pantallitaMarca}>VOITOS</Text>
      </View>
      <View style={styles.boton} />
      <View style={styles.bandeja} />
    </View>
  );
}

function TarjetaPastillero({
  p,
  todos,
  alCambiar,
  alDesvincular,
}: {
  p: PastilleroVinculado;
  todos: PastilleroVinculado[];
  alCambiar: (p: PastilleroVinculado) => void;
  alDesvincular: (p: PastilleroVinculado) => void;
}) {
  const styles = useEstilos();
  const colores = useColores();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(p.nombre ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      alCambiar(await renombrarPastillero(p.dispositivo_id, nombre.trim() || null));
      setEditando(false);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cambiar el nombre");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.tarjeta}>
      <Dibujo />

      <View style={styles.tarjetaCuerpo}>
        {editando ? (
          <>
            <Text style={styles.etiqueta}>Nombre del pastillero</Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Casa de mamá"
              placeholderTextColor={colores.textoTenue}
              maxLength={40}
              autoFocus
              onSubmitEditing={guardar}
              style={styles.campoNombre}
              accessibilityLabel="Nombre del pastillero"
            />
            <Text style={styles.ayuda}>Solo lo ves vos.</Text>
            <Aviso texto={error} />
            <View style={styles.fila}>
              <Boton titulo="Cancelar" variante="secundario" ancho="auto" onPress={() => setEditando(false)} />
              <Boton titulo="Guardar" ancho="auto" onPress={guardar} cargando={guardando} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.nombreFila}>
              <Text style={styles.nombre} numberOfLines={1}>
                {nombrePastillero(todos, p.dispositivo_id)}
              </Text>
              <Pressable
                onPress={() => {
                  setNombre(p.nombre ?? "");
                  setEditando(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cambiar el nombre"
                hitSlop={10}
                style={({ pressed }) => [styles.lapiz, pressed && styles.lapizActivo]}
              >
                <Ionicons name="pencil" size={18} color={colores.acento} />
              </Pressable>
            </View>

            <View style={styles.estados}>
              <Estado texto="Vinculado" tono="ok" icono="link-outline" />
              {p.nombre && <Estado texto={p.dispositivo_id} tono="neutro" icono="hardware-chip-outline" />}
            </View>

            {p.vinculado_at && (
              <Text style={styles.detalle}>Desde el {fechaConAnio(p.vinculado_at.slice(0, 10))}</Text>
            )}

            <View style={styles.pie}>
              <Boton
                titulo="Desvincular"
                variante="enlace"
                ancho="auto"
                icono="unlink-outline"
                onPress={() => alDesvincular(p)}
                ayuda="Tus dosis dejan de salir por este pastillero"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function MiPastillero() {
  const styles = useEstilos();
  const colores = useColores();
  const escritorio = useEscritorio();
  const primeraVez = useLocalSearchParams<{ primera?: string }>().primera === "1";

  const [pastilleros, setPastilleros] = useState<PastilleroVinculado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [vinculando, setVinculando] = useState(false);

  const cargar = useCallback(() => {
    getMisPastilleros()
      .then((p) => {
        setPastilleros(p);
        setError("");
      })
      .catch((e: any) => setError(e?.message ?? "No se pudo ver tu pastillero"))
      .finally(() => setCargando(false));
  }, []);

  useFocusEffect(cargar);

  const vincular = async () => {
    const limpio = codigo.replace(/\D/g, "");
    if (limpio.length !== 8) {
      setErrorCodigo("Son los 8 números que aparecen abajo de la hora en el pastillero.");
      return;
    }

    setVinculando(true);
    setErrorCodigo("");
    setListo("");
    try {
      await vincularPastillero(limpio);
      setCodigo("");
      if (primeraVez) {
        router.replace("/home");
        return;
      }
      setListo("Listo, el pastillero quedó vinculado a tu cuenta. Podés ponerle un nombre con el lápiz.");
      cargar();
    } catch (e: any) {
      setErrorCodigo(e?.message ?? "No se pudo vincular");
    } finally {
      setVinculando(false);
    }
  };

  const desvincular = async (p: PastilleroVinculado) => {
    const seguro = await confirmar(
      "Desvincular el pastillero",
      "Tus dosis dejan de salir por este pastillero. " +
        "Para volver a vincularlo, vas a necesitar el código que muestra su pantalla.",
      "Desvincular",
      "peligro"
    );
    if (!seguro) return;

    setError("");
    setListo("");
    try {
      await desvincularPastillero(p.dispositivo_id);
      cargar();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo desvincular");
    }
  };

  const reemplazar = (nuevo: PastilleroVinculado) =>
    setPastilleros((lista) => lista.map((x) => (x.dispositivo_id === nuevo.dispositivo_id ? nuevo : x)));

  const lista = cargando ? (
    <Cargando texto="Buscando tu pastillero..." />
  ) : pastilleros.length === 0 ? (
    <View style={styles.vacio}>
      <Dibujo chico />
      <View style={styles.vacioTextos}>
        <Text style={styles.vacioTitulo}>Todavía no vinculaste ninguno</Text>
      </View>
    </View>
  ) : (
    pastilleros.map((p) => (
      <TarjetaPastillero key={p.dispositivo_id} p={p} todos={pastilleros} alCambiar={reemplazar} alDesvincular={desvincular} />
    ))
  );

  const vincularPanel = (
    <View style={styles.panel}>
      <Text style={styles.panelTitulo}>
        {pastilleros.length ? "Vincular otro pastillero" : "Vincular tu pastillero"}
      </Text>

      {PASOS.map((paso, i) => (
        <View key={paso.titulo} style={styles.paso}>
          <View style={styles.pasoNumero}>
            <Text style={styles.pasoNumeroTexto}>{i + 1}</Text>
          </View>
          <View style={styles.pasoTextos}>
            <View style={styles.pasoTituloFila}>
              <Ionicons name={paso.icono} size={18} color={colores.acento} />
              <Text style={styles.pasoTitulo}>{paso.titulo}</Text>
            </View>
            <Text style={styles.pasoDetalle}>{paso.detalle}</Text>
          </View>
        </View>
      ))}

      <Campo
        etiqueta="Código del pastillero"
        valor={codigo}
        alCambiar={setCodigo}
        error={errorCodigo}
        teclado="number-pad"
        placeholder="1234 5678"
        ayuda="Se renueva cada 30 minutos."
      />
      <Boton titulo="Vincular" icono="link-outline" onPress={vincular} cargando={vinculando} />
      {primeraVez && (
        <Boton
          titulo="Hacerlo más tarde"
          variante="enlace"
          onPress={() => router.replace("/home")}
          ayuda="Lo podés vincular después desde tu perfil"
        />
      )}
    </View>
  );

  return (
    <Pantalla angosta={!escritorio}>
      {primeraVez ? (
        <Encabezado
          titulo="Vinculá tu pastillero"
          sinVolver
          bajada="Así tus dosis salen por él."
        />
      ) : (
        <Encabezado titulo="Mi pastillero" volverA="/perfil" principal />
      )}

      <Aviso texto={error} />
      <Aviso texto={listo} tipo="ok" />

      {escritorio ? (
        <Columnas principal={lista} lateral={vincularPanel} />
      ) : (
        <>
          {lista}
          {vincularPanel}
        </>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  aparato: {
    width: 132,
    height: 150,
    borderRadius: radio.lg,
    backgroundColor: "#0B1B12",
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    alignItems: "center",
    paddingTop: espacio.md,
  },

  aparatoChico: {
    width: 96,
    height: 112,
  },

  pantallita: {
    width: "78%",
    aspectRatio: 2,
    borderRadius: radio.sm,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1E3B2A",
    alignItems: "center",
    justifyContent: "center",
  },

  pantallitaHora: {
    fontFamily: fuentes.negrita,
    fontSize: 24,
    lineHeight: 28,
    color: colores.acento,
    letterSpacing: 1,
  },

  pantallitaHoraChica: {
    fontSize: 17,
    lineHeight: 20,
  },

  pantallitaMarca: {
    fontFamily: fuentes.negrita,
    fontSize: 8,
    letterSpacing: 2,
    color: colores.acentoSuave,
  },

  boton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colores.acento,
    marginTop: espacio.md,
    borderWidth: 3,
    borderColor: "#064421",
  },

  bandeja: {
    position: "absolute",
    bottom: 10,
    width: "56%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#04140A",
    borderWidth: 1,
    borderColor: "#1E3B2A",
  },

  tarjeta: {
    flexDirection: "row",
    gap: espacio.xl,
    alignItems: "center",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.xl,
    padding: espacio.xl,
    marginBottom: espacio.lg,
  },

  tarjetaCuerpo: {
    flex: 1,
    minWidth: 0,
  },

  nombreFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
  },

  nombre: {
    ...texto.seccion,
    color: colores.texto,
    flexShrink: 1,
  },

  lapiz: {
    padding: espacio.xs,
    borderRadius: radio.sm,
  },

  lapizActivo: {
    backgroundColor: colores.superficieAlta,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.sm,
  },

  detalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },

  pie: {
    flexDirection: "row",
    marginTop: espacio.sm,
  },

  etiqueta: {
    ...texto.etiqueta,
    color: colores.textoTenue,
    marginBottom: espacio.xs,
  },

  campoNombre: {
    ...texto.cuerpo,
    color: colores.texto,
    borderWidth: 2,
    borderColor: colores.acento,
    borderRadius: radio.md,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.xs,
    marginBottom: espacio.sm,
  },

  fila: {
    flexDirection: "row",
    gap: espacio.md,
    marginTop: espacio.sm,
  },

  vacio: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colores.borde,
    borderRadius: radio.xl,
    padding: espacio.xl,
    marginBottom: espacio.lg,
  },

  vacioTextos: {
    flex: 1,
  },

  vacioTitulo: {
    ...texto.item,
    color: colores.texto,
  },

  panel: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.xl,
    padding: espacio.xl,
    marginBottom: espacio.xl,
  },

  panelTitulo: {
    ...texto.seccion,
    color: colores.texto,
    marginBottom: espacio.lg,
  },

  paso: {
    flexDirection: "row",
    gap: espacio.md,
    marginBottom: espacio.lg,
  },

  pasoNumero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colores.acento,
    alignItems: "center",
    justifyContent: "center",
  },

  pasoNumeroTexto: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
    fontSize: 15,
    lineHeight: 18,
  },

  pasoTextos: {
    flex: 1,
  },

  pasoTituloFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
  },

  pasoTitulo: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  pasoDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: 2,
  },
}));
