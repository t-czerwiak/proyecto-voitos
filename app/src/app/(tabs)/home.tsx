import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AvisoVerificacion from "../../components/AvisoVerificacion";
import FilaDosis from "../../components/FilaDosis";
import TarjetaLanding from "../../components/TarjetaLanding";
import {
  soyAdmin,
  getUsuarioActual,
  getHorariosDelUsuario,
  getActividades,
  Actividad,
  Horario,
} from "../../lib/voitos";
import { fechaLarga, fechaRelativa, hoyISO, comoHora } from "../../lib/fechas";
import { proximaDosis, resumirDia } from "../../lib/dosis";
import {
  armarRutinas,
  rutinaDeHorario,
  rutinasActivas,
  letraDelDia,
} from "../../lib/rutinas";
import { Pantalla, Tarjeta, Boton, Aviso, Vacio, Cargando, Estado, Columnas, useEscritorio } from "../../ui";
import { crearEstilos, useColores, espacio, texto } from "../../tema";

const HORAS_VISIBLE_DESPUES = 12;

export default function Hoy() {
  const styles = useEstilos();
  const colores = useColores();
  const escritorio = useEscritorio();

  const [admin, setAdmin] = useState(false);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const usuario = getUsuarioActual();
  const hoy = hoyISO();

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      soyAdmin()
        .then((r) => vigente && setAdmin(r.admin))
        .catch(() => vigente && setAdmin(false));

      getActividades()
        .then((datos) => vigente && setActividades(datos))
        .catch(() => vigente && setActividades([]));

      getHorariosDelUsuario()
        .then((datos) => {
          if (!vigente) return;
          setHorarios(datos);
          setError("");
        })
        .catch((e: any) => {
          if (!vigente) return;
          setHorarios([]);
          setError(e?.message ?? "No se pudieron cargar las dosis");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  const rutinas = useMemo(() => rutinasActivas(armarRutinas(horarios, colores.rutinas)), [horarios, colores.rutinas]);

  const dosisDeHoy = useMemo(
    () =>
      horarios
        .filter((h) => h.dia === hoy)
        .sort((a, b) => a.hora - b.hora || a.minuto - b.minuto),
    [horarios, hoy]
  );

  const resumen = useMemo(() => resumirDia(dosisDeHoy), [dosisDeHoy]);

  const dosisVisibles = useMemo(() => {
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return dosisDeHoy.filter((d) => !(d.dispensado && minutosAhora - (d.hora * 60 + d.minuto) >= HORAS_VISIBLE_DESPUES * 60));
  }, [dosisDeHoy]);
  const proxima = useMemo(() => proximaDosis(horarios), [horarios]);

  const actividadesDeHoy = useMemo(() => {
    const letra = letraDelDia(hoy);
    return actividades
      .filter((a) => (a.tipo === "una-vez" ? a.fecha === hoy : a.dias?.includes(letra)))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [actividades, hoy]);

  const nombrePastilla = proxima?.pastillas?.nombre ?? "Pastilla";
  const cantidadProxima =
    proxima?.cantidad === 1 ? "1 pastilla" : `${proxima?.cantidad} pastillas`;

  const acciones = (
    <>
      {admin && (
        <Boton
          titulo="Panel de administración"
          variante="secundario"
          icono="shield-outline"
          ancho={escritorio ? "auto" : "completo"}
          onPress={() => router.push("/admin")}
        />
      )}

      {!escritorio && (
        <Boton
          titulo="Tu perfil"
          variante="enlace"
          icono="person-circle-outline"
          onPress={() => router.push("/perfil")}
          ayuda="Tus datos, tus pastillas, y cerrar sesión"
        />
      )}
    </>
  );

  const otrasActividades = !cargando && actividadesDeHoy.length > 0 && (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion} accessibilityRole="header">
        Otras actividades de hoy
      </Text>

      {actividadesDeHoy.map((a) => (
        <Tarjeta key={a.id}>
          <View
            style={styles.actividad}
            accessible
            accessibilityLabel={`A las ${a.hora}, ${a.nombre}`}
          >
            <Text style={styles.actividadHora}>{a.hora}</Text>
            <Text style={styles.actividadNombre}>{a.nombre}</Text>
          </View>
        </Tarjeta>
      ))}
    </View>
  );

  return (
    <Pantalla ancha={escritorio}>
      <View style={escritorio ? styles.cabeceraAncha : undefined}>
        <View style={styles.saludo}>
          <Text style={styles.hola} accessibilityRole="header">
            {usuario?.nombre ? `Hola, ${usuario.nombre}` : "Hola"}
          </Text>
          <Text style={styles.fecha}>Hoy es {fechaLarga(hoy)}</Text>
        </View>

        {escritorio && <View style={styles.accionesArriba}>{acciones}</View>}
      </View>

      <AvisoVerificacion />

      <Aviso texto={error} />

      {resumen.sinDispensar > 0 && (
        <Aviso
          tipo="atencion"
          titulo="Revisá el pastillero"
          texto={
            resumen.sinDispensar === 1
              ? "Hay 1 dosis de hoy que no salió del pastillero."
              : `Hay ${resumen.sinDispensar} dosis de hoy que no salieron del pastillero.`
          }
        />
      )}

      <Columnas
        principal={
          <>
            {cargando ? (
              <Cargando texto="Buscando las dosis de hoy..." />
            ) : (
              <>
                {proxima && (
                  <View style={styles.seccion}>
                    <Text style={styles.tituloSeccion} accessibilityRole="header">
                      La que sigue
                    </Text>

                    <Tarjeta destacada>
                      <View
                        accessible
                        accessibilityLabel={`La próxima dosis es ${fechaRelativa(
                          proxima.dia
                        )} a las ${comoHora(
                          proxima.hora,
                          proxima.minuto
                        )}: ${nombrePastilla}, ${cantidadProxima}.`}
                      >
                        <Text style={styles.proximaCuando}>
                          {fechaRelativa(proxima.dia)} a las{" "}
                          {comoHora(proxima.hora, proxima.minuto)}
                        </Text>

                        <Text style={styles.proximaPastilla}>{nombrePastilla}</Text>

                        <Text style={styles.proximaCantidad}>{cantidadProxima}</Text>
                      </View>
                    </Tarjeta>
                  </View>
                )}

                <View style={styles.seccion}>
                  <Text style={styles.tituloSeccion} accessibilityRole="header">
                    La medicación de hoy
                  </Text>

                  {dosisDeHoy.length > 0 && (
                    <View style={styles.marcadores}>
                      <Estado
                        texto={`${resumen.dispensadas} ${
                          resumen.dispensadas === 1 ? "salió" : "salieron"
                        }`}
                        tono="ok"
                      />
                      {resumen.pendientes > 0 && (
                        <Estado texto={`${resumen.pendientes} por salir`} tono="neutro" />
                      )}
                      {resumen.sinDispensar > 0 && (
                        <Estado texto={`${resumen.sinDispensar} sin salir`} tono="atencion" />
                      )}
                    </View>
                  )}

                  {dosisDeHoy.length === 0 ? (
                    <Vacio
                      icono="medkit-outline"
                      titulo="Hoy no hay ninguna dosis agendada"
                      detalle="Si el tratamiento arranca hoy, agendalo desde Pastillas."
                      accion={{
                        titulo: "Agendar una dosis",
                        onPress: () => router.push("/agendar-medicacion"),
                      }}
                    />
                  ) : dosisVisibles.length === 0 ? (
                    <Text style={styles.todasSalieron}>Todas las dosis de hoy ya salieron.</Text>
                  ) : (
                    dosisVisibles.map((dosis) => {
                      const suRutina = rutinaDeHorario(rutinas, dosis);
                      return (
                        <FilaDosis
                          key={dosis.id}
                          dosis={dosis}
                          color={suRutina?.color}
                          detalle={
                            suRutina
                              ? `Rutina: ${suRutina.dias.join(" ")} a las ${suRutina.horaTexto}`
                              : "Dosis suelta"
                          }
                        />
                      );
                    })
                  )}
                </View>

                {!escritorio && otrasActividades}
              </>
            )}
          </>
        }
        lateral={
          <>
            {escritorio && otrasActividades}

            {escritorio && (
              <View style={styles.seccion}>
                <Text style={styles.tituloSeccion} accessibilityRole="header">
                  Cargar algo nuevo
                </Text>

                <View style={styles.pie}>
                  <Boton
                    titulo="Agendar una dosis"
                    variante="secundario"
                    icono="alarm-outline"
                    onPress={() => router.push("/agendar-medicacion")}
                  />
                  <Boton
                    titulo="Agregar una pastilla"
                    variante="secundario"
                    icono="medkit-outline"
                    onPress={() => router.push("/agregar-medicacion")}
                  />
                  <Boton
                    titulo="Agregar una actividad"
                    variante="secundario"
                    icono="calendar-outline"
                    onPress={() => router.push("/agregar-actividad")}
                  />
                </View>
              </View>
            )}

            {!escritorio && (
              <View style={styles.seccion}>
                <Text style={styles.tituloSeccion} accessibilityRole="header">
                  Dónde ir
                </Text>

                <Acceso
                  icono="calendar"
                  titulo="Calendario"
                  detalle="Todas las dosis agendadas, día por día, y las rutinas en curso."
                  onPress={() => router.push("/calendario")}
                />

                <Acceso
                  icono="medkit"
                  titulo="Pastillas"
                  detalle="Cargar una pastilla nueva, agendar dosis y recargar los módulos."
                  onPress={() => router.push("/medicacion")}
                />
              </View>
            )}

            {!escritorio && <View style={styles.pie}>{acciones}</View>}

            <TarjetaLanding />
          </>
        }
      />
    </Pantalla>
  );
}

function Acceso({
  icono,
  titulo,
  detalle,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  onPress: () => void;
}) {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <Tarjeta onPress={onPress} etiqueta={titulo} ayuda={detalle}>
      <View style={styles.acceso}>
        <View style={styles.accesoIcono}>
          <Ionicons name={icono} size={26} color={colores.acento} />
        </View>

        <View style={styles.accesoTextos}>
          <Text style={styles.accesoTitulo}>{titulo}</Text>
          <Text style={styles.accesoDetalle}>{detalle}</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color={colores.textoTenue} />
      </View>
    </Tarjeta>
  );
}

const useEstilos = crearEstilos((colores) => ({
  saludo: {
    marginBottom: espacio.xl,
  },

  cabeceraAncha: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: espacio.lg,
  },

  accionesArriba: {
    flexDirection: "row",
    gap: espacio.md,
  },

  hola: {
    ...texto.titulo,
    color: colores.texto,
  },

  fecha: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.xs,
  },

  seccion: {
    marginBottom: espacio.xl,
  },

  tituloSeccion: {
    ...texto.seccion,
    color: colores.texto,
    marginBottom: espacio.md,
  },

  todasSalieron: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  marcadores: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginBottom: espacio.md,
  },

  proximaCuando: {
    ...texto.hora,
    color: colores.acento,
  },

  proximaPastilla: {
    ...texto.item,
    color: colores.texto,
    marginTop: espacio.xs,
  },

  proximaCantidad: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  actividad: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
  },

  actividadHora: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
    minWidth: 60,
  },

  actividadNombre: {
    ...texto.item,
    color: colores.texto,
    flex: 1,
  },

  acceso: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
  },

  accesoIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.superficieAlta,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  accesoTextos: {
    flex: 1,
  },

  accesoTitulo: {
    ...texto.item,
    color: colores.texto,
  },

  accesoDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: 2,
  },

  pie: {
    gap: espacio.md,
    marginTop: espacio.sm,
  },
}));
