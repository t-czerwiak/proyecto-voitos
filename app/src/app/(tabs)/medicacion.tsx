import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getPastillas, Pastilla } from "../../lib/voitos";
import {
  Pantalla,
  Encabezado,
  Boton,
  Tarjeta,
  Estado,
  Aviso,
  Vacio,
  Cargando,
} from "../../ui";
import { colores, espacio, texto } from "../../tema";

// Cuando quedan menos que esto en un modulo, conviene recargar antes de que
// una dosis quede sin salir. Cinco es aproximadamente dos dias de una rutina
// de dos pastillas por dia: alcanza para reaccionar sin alarmar todo el
// tiempo.
const STOCK_BAJO = 5;

// La pantalla de las pastillas.
//
// Antes eran tres botones —AGREGAR, AGENDAR, RECARGAR— sobre un fondo vacio,
// sin ninguna informacion. Para saber cuantas pastillas quedaban en un modulo
// habia que entrar a RECARGAR y abrir el desplegable.
//
// El dato de cuanto queda es justamente el que evita el problema que la
// aplicacion existe para evitar: que llegue la hora y el modulo este vacio.
// Asi que ahora esta a la vista, y con aviso cuando esta por acabarse.
export default function Pastillas() {
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      getPastillas()
        .then((lista) => {
          if (!vigente) return;
          setPastillas(lista);
          setError("");
        })
        .catch((e: any) => {
          if (!vigente) return;
          setPastillas([]);
          setError(e?.message ?? "No se pudieron cargar las pastillas");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  const faltantes = pastillas.filter(
    (p) => p.modulo && p.modulo.cantidad_actual <= STOCK_BAJO
  );

  return (
    <Pantalla>
      <Encabezado
        titulo="Pastillas"
        bajada="Lo que hay cargado en el pastillero y lo que se puede hacer con eso."
        volverA="/home"
      />

      <Aviso texto={error} />

      {faltantes.length > 0 && (
        <Aviso
          tipo="atencion"
          titulo="Se están por acabar"
          texto={
            faltantes.length === 1
              ? `Queda poco de ${faltantes[0].nombre}. Recargá el módulo antes de que una dosis quede sin salir.`
              : `Queda poco de ${faltantes.length} pastillas. Recargá los módulos antes de que una dosis quede sin salir.`
          }
        />
      )}

      <View style={styles.acciones}>
        <Boton
          titulo="Agendar una dosis"
          icono="calendar-outline"
          onPress={() => router.push("/agendar-medicacion")}
          ayuda="Elegís la pastilla, la hora y los días de la semana"
        />

        <Boton
          titulo="Cargar una pastilla nueva"
          variante="secundario"
          icono="add-circle-outline"
          onPress={() => router.push("/agregar-medicacion")}
          ayuda="Para una pastilla que todavía no está en el pastillero"
        />

        <Boton
          titulo="Recargar o borrar"
          variante="secundario"
          icono="refresh-outline"
          onPress={() => router.push("/recargar-medicacion")}
          ayuda="Sumar pastillas a un módulo, o eliminar una que ya no se usa"
        />
      </View>

      <Text style={styles.tituloSeccion} accessibilityRole="header">
        Lo que hay cargado
      </Text>

      {cargando ? (
        <Cargando texto="Buscando las pastillas..." />
      ) : pastillas.length === 0 ? (
        <Vacio
          icono="medkit-outline"
          titulo="Todavía no cargaste ninguna pastilla"
          detalle="El primer paso es cargar la pastilla y decir cuántas pusiste en el módulo del pastillero."
          accion={{
            titulo: "Cargar la primera",
            onPress: () => router.push("/agregar-medicacion"),
          }}
        />
      ) : (
        pastillas.map((p) => {
          const sinModulo = !p.modulo;
          const quedan = p.modulo?.cantidad_actual ?? 0;
          const poco = !sinModulo && quedan <= STOCK_BAJO;

          const dondeEsta = sinModulo
            ? "No está cargada en ningún módulo"
            : `Módulo ${p.modulo!.numero}`;

          const cuantas = sinModulo
            ? "El pastillero no la va a poder dispensar"
            : quedan === 1
              ? "Queda 1 pastilla"
              : `Quedan ${quedan} pastillas`;

          return (
            <Tarjeta key={p.id}>
              <View accessible accessibilityLabel={`${p.nombre}. ${dondeEsta}. ${cuantas}.`}>
                <Text style={styles.nombre}>{p.nombre}</Text>

                <Text style={styles.detalle}>{dondeEsta}</Text>

                <View style={styles.estado}>
                  <Estado
                    texto={cuantas}
                    tono={sinModulo ? "atencion" : poco ? "atencion" : "ok"}
                    icono={sinModulo ? "alert-circle" : poco ? "warning" : "checkmark-circle"}
                  />
                </View>
              </View>
            </Tarjeta>
          );
        })
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  acciones: {
    gap: espacio.md,
    marginBottom: espacio.xxl,
  },

  tituloSeccion: {
    ...texto.seccion,
    color: colores.texto,
    marginBottom: espacio.md,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
  },

  detalle: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.xs,
  },

  estado: {
    marginTop: espacio.md,
  },
});
