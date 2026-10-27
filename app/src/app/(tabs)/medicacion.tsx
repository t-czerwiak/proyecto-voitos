import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  getPastillas,
  getMisPastilleros,
  nombrePastillero,
  Pastilla,
  type PastilleroVinculado,
} from "../../lib/voitos";
import IconoPastilla, { etiquetaTamano } from "../../components/IconoPastilla";
import {
  Pantalla,
  Encabezado,
  Boton,
  Tarjeta,
  Estado,
  Aviso,
  Vacio,
  Cargando,
  Columnas,
  useEscritorio,
} from "../../ui";
import { crearEstilos, espacio, texto } from "../../tema";

const STOCK_BAJO = 5;

export default function Pastillas() {
  const styles = useEstilos();
  const escritorio = useEscritorio();

  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [pastilleros, setPastilleros] = useState<PastilleroVinculado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      getMisPastilleros()
        .then((lista) => vigente && setPastilleros(lista))
        .catch(() => {});

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

  const acciones = (
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
        ayuda="Sumar pastillas al pastillero, o eliminar una que ya no se usa"
      />
    </View>
  );

  const lista = (
    <>
      <Text style={styles.tituloSeccion} accessibilityRole="header">
        Lo que hay cargado
      </Text>

      {cargando ? (
        <Cargando texto="Buscando las pastillas..." />
      ) : pastillas.length === 0 ? (
        <Vacio
          icono="medkit-outline"
          titulo="Todavía no cargaste ninguna pastilla"
          accion={{
            titulo: "Cargar la primera",
            onPress: () => router.push("/agregar-medicacion"),
          }}
        />
      ) : (
        <View style={escritorio ? styles.grilla : undefined}>
          {pastillas.map((p) => {
            const sinModulo = !p.modulo;
            const quedan = p.modulo?.cantidad_actual ?? 0;
            const poco = !sinModulo && quedan <= STOCK_BAJO;

            const dondeEsta = sinModulo
              ? "No está cargada en ningún pastillero"
              : `En ${nombrePastillero(pastilleros, p.modulo!.dispositivo_id) ?? "el pastillero"}`;
            const tamano = etiquetaTamano(p.tipo);

            const cuantas = sinModulo
              ? "El pastillero no la va a poder dispensar"
              : quedan === 1
                ? "Queda 1 pastilla"
                : `Quedan ${quedan} pastillas`;

            return (
              <View key={p.id} style={escritorio ? styles.grillaItem : undefined}>
                <Tarjeta>
                  <View accessible accessibilityLabel={`${p.nombre}. ${dondeEsta}. ${cuantas}.`}>
                    <View style={styles.cabeceraPastilla}>
                      <View style={styles.icono}>
                        <IconoPastilla tipo={p.tipo} tam={40} />
                      </View>
                      <View style={styles.textos}>
                        <Text style={styles.nombre}>{p.nombre}</Text>
                        {tamano && <Text style={styles.tamano}>{tamano}</Text>}
                      </View>
                    </View>

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
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <Pantalla>
      <Encabezado
        titulo="Pastillas"
        volverA="/home"
        principal
      />

      <Aviso texto={error} />

      {faltantes.length > 0 && (
        <Aviso
          tipo="atencion"
          titulo="Se están por acabar"
          texto={
            faltantes.length === 1
              ? `Queda poco de ${faltantes[0].nombre}. Recargá el pastillero antes de que una dosis quede sin salir.`
              : `Queda poco de ${faltantes.length} pastillas. Recargá el pastillero antes de que una dosis quede sin salir.`
          }
        />
      )}

      {escritorio ? (
        <Columnas
          principal={lista}
          lateral={
            <>
              <Text style={styles.tituloSeccion} accessibilityRole="header">
                Qué querés hacer
              </Text>
              {acciones}
            </>
          }
        />
      ) : (
        <>
          {acciones}
          {lista}
        </>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  acciones: {
    gap: espacio.md,
    marginBottom: espacio.xxl,
  },

  tituloSeccion: {
    ...texto.seccion,
    color: colores.texto,
    marginBottom: espacio.md,
  },

  cabeceraPastilla: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
  },

  icono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.superficieAlta,
  },

  textos: {
    flex: 1,
  },

  tamano: {
    ...texto.dato,
    color: colores.textoTenue,
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

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  grillaItem: {
    width: "48.5%",
  },
}));
