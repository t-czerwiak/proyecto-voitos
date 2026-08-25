import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AvisoVerificacion from "../../components/AvisoVerificacion";
import FilaDosis from "../../components/FilaDosis";
import {
  soyAdmin,
  cerrarSesion,
  getUsuarioActual,
  getHorariosDelUsuario,
  getActividades,
  Actividad,
  Horario,
} from "../../lib/voitos";
import { confirmar } from "../../lib/avisos";
import { fechaLarga, fechaRelativa, hoyISO, comoHora } from "../../lib/fechas";
import { proximaDosis, resumirDia } from "../../lib/dosis";
import {
  armarRutinas,
  rutinaDeHorario,
  rutinasActivas,
  letraDelDia,
} from "../../lib/rutinas";
import { Pantalla, Tarjeta, Boton, Aviso, Vacio, Cargando, Estado } from "../../ui";
import { crearEstilos, useColores, espacio, texto } from "../../tema";

// La pantalla de inicio.
//
// Antes era un menu: la palabra "MENÚ" en 45px y dos fotos que solo mostraban
// su titulo al pasar el mouse por encima —o sea, nunca, en un celular—. Para
// saber si la medicacion de hoy habia salido habia que entrar al calendario,
// buscar el dia y leer una lista que no decia el estado de nada.
//
// La pregunta con la que un cuidador abre esta aplicacion es una sola: si
// salio la medicacion. Asi que la pantalla es la respuesta a esa pregunta, y
// los accesos a las otras secciones van despues.
export default function Hoy() {
  const styles = useEstilos();
  const colores = useColores();

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

      // El acceso al panel solo aparece si el backend confirma el rol. No es
      // una medida de seguridad: entrar a /admin a mano no sirve, porque esas
      // rutas responden 404 a quien no es admin. Es para no mostrarle a un
      // cuidador un boton que no le corresponde.
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
          // Antes esto vaciaba la lista en silencio, asi que un backend caido
          // se veia igual que "no hay nada agendado para hoy".
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
  const proxima = useMemo(() => proximaDosis(horarios), [horarios]);

  const actividadesDeHoy = useMemo(() => {
    const letra = letraDelDia(hoy);
    return actividades
      .filter((a) => (a.tipo === "una-vez" ? a.fecha === hoy : a.dias?.includes(letra)))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [actividades, hoy]);

  // Confirma antes de salir. Cerrar sesion sin querer obliga a escribir mail y
  // contrasena de nuevo, y esta pantalla se toca a diario.
  const salir = async () => {
    const seguro = await confirmar(
      "Cerrar sesión",
      usuario?.mail
        ? `Vas a salir de la cuenta ${usuario.mail}. Para volver a entrar vas a tener que iniciar sesión de nuevo.`
        : "Para volver a entrar vas a tener que iniciar sesión de nuevo.",
      "Cerrar sesión"
    );
    if (!seguro) return;

    cerrarSesion();

    // replace y no push: si quedara en el historial, el boton de atras del
    // navegador devolveria a esta pantalla con la sesion ya cerrada, y todo
    // empezaria a fallar con 401.
    router.replace("/");
  };

  const nombrePastilla = proxima?.pastillas?.nombre ?? "Pastilla";
  const cantidadProxima =
    proxima?.cantidad === 1 ? "1 pastilla" : `${proxima?.cantidad} pastillas`;

  return (
    <Pantalla>
      <View style={styles.saludo}>
        <Text style={styles.hola} accessibilityRole="header">
          {usuario?.nombre ? `Hola, ${usuario.nombre}` : "Hola"}
        </Text>
        <Text style={styles.fecha}>Hoy es {fechaLarga(hoy)}</Text>
      </View>

      <AvisoVerificacion />

      <Aviso texto={error} />

      {/* Lo primero que se ve: si algo no salio, se dice arriba de todo y con
          todas las letras. Es la unica razon por la que alguien abre esto de
          apuro. */}
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

      {cargando ? (
        <Cargando texto="Buscando las dosis de hoy..." />
      ) : (
        <>
          {/* LA QUE SIGUE */}
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

          {/* LA MEDICACIÓN DE HOY */}
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
            ) : (
              dosisDeHoy.map((dosis) => {
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

          {/* OTRAS ACTIVIDADES */}
          {actividadesDeHoy.length > 0 && (
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
          )}
        </>
      )}

      {/* DÓNDE IR */}
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

      <View style={styles.pie}>
        {admin && (
          <Boton
            titulo="Panel de administración"
            variante="secundario"
            icono="shield-outline"
            onPress={() => router.push("/admin")}
          />
        )}

        <Boton
          titulo="Cerrar sesión"
          variante="enlace"
          icono="log-out-outline"
          onPress={salir}
          ayuda="Vas a tener que escribir el mail y la contraseña de nuevo"
        />
      </View>
    </Pantalla>
  );
}

// Un acceso a otra seccion.
//
// Reemplaza a las tarjetas con foto: el titulo aparecia recien al pasar el
// mouse por encima, asi que en un celular las dos tarjetas eran dos fotos sin
// nombre. Aca el titulo y la explicacion estan siempre, y la tarjeta entera es
// el area que se toca.
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
