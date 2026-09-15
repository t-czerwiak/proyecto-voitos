import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  cerrarSesion,
  borrarMiCuenta,
  cambiarFechaNacimiento,
  getPastillas,
  getHorariosDelUsuario,
  type Pastilla,
  type Horario,
} from "../lib/voitos";
// Usuario vive en lib/api.ts, que es donde esta el tipo de la sesion.
import type { Usuario } from "../lib/api";
import { proximaDosis } from "../lib/dosis";
import { edadDesde, fechaConAnio, comoHora, fechaRelativa } from "../lib/fechas";
import { confirmar } from "../lib/avisos";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Boton,
  Aviso,
  Estado,
  Vacio,
  Cargando,
  CampoFechaNacimiento,
} from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

// El perfil.
//
// EL ORDEN DE LA PANTALLA ES LA DECISION MAS IMPORTANTE DE ACA.
//
// Arranca por lo que se viene —la proxima dispensacion— y sigue por las
// pastillas, porque quien abre esta pantalla casi siempre viene a mirar eso.
// Los datos de la cuenta van despues: el mail propio no se consulta, se sabe.
// Y al final, separadas y con aire, las dos cosas que no se pueden deshacer.
//
// Antes estaba al reves: el nombre y el mail arriba de todo en una tarjeta
// grande, con el nombre en 30px. Se veia como una ficha de registro y no como
// algo que sirva para algo. El nombre propio no es informacion: esta para
// reconocer que la cuenta es la tuya, y para eso alcanza con verlo.
//
// Cerrar sesion y borrar la cuenta viven SOLO aca. El inicio se abre veinte
// veces por dia y no hay motivo para tener a mano el boton que obliga a
// escribir mail y contrasena de nuevo.
export default function Perfil() {
  const styles = useEstilos();

  const [usuario, setUsuario] = useState<Usuario | null>(getUsuarioActual());
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(false);

  // La edicion de la fecha. editando=false es el estado normal: se ve el dato
  // y un boton para cambiarlo.
  const [editando, setEditando] = useState(false);
  const [fechaNueva, setFechaNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorFecha, setErrorFecha] = useState("");

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      // El usuario de la sesión puede estar viejo: se guardó al entrar y desde
      // entonces pudo cambiar. Se pide de nuevo, pero sin romper la pantalla si
      // falla, porque lo guardado alcanza para mostrar algo.
      refrescarUsuario()
        .then((u) => vigente && u && setUsuario(u))
        .catch(() => {});

      Promise.all([getPastillas(), getHorariosDelUsuario()])
        .then(([p, h]) => {
          if (!vigente) return;
          setPastillas(p);
          setHorarios(h);
          setError("");
        })
        .catch((e: any) => {
          if (!vigente) return;
          setError(e?.message ?? "No se pudieron cargar tus datos");
        })
        .finally(() => {
          if (vigente) setCargando(false);
        });

      return () => {
        vigente = false;
      };
    }, [])
  );

  // La próxima dosis de CADA pastilla, no la próxima en general: en la lista lo
  // que se mira es "¿esta pastilla está andando?", una por una.
  const proximaPorPastilla = useMemo(() => {
    const mapa = new Map<string, Horario | null>();
    for (const p of pastillas) {
      mapa.set(p.id, proximaDosis(horarios.filter((h) => h.pastilla_id === p.id)));
    }
    return mapa;
  }, [pastillas, horarios]);

  const proximaGeneral = useMemo(() => proximaDosis(horarios), [horarios]);

  const edad = edadDesde(usuario?.fecha_nacimiento);

  const empezarAEditar = () => {
    setFechaNueva(usuario?.fecha_nacimiento ?? "");
    setErrorFecha("");
    setEditando(true);
  };

  const guardarFecha = async () => {
    if (!fechaNueva) {
      setErrorFecha("Elegí el día, el mes y el año.");
      return;
    }

    setGuardando(true);
    setErrorFecha("");
    try {
      const actualizado = await cambiarFechaNacimiento(fechaNueva);
      setUsuario(actualizado);
      setEditando(false);
    } catch (e: any) {
      // El backend valida lo mismo que el formulario, pero tiene la ultima
      // palabra: si rechaza algo, se muestra su mensaje tal cual.
      setErrorFecha(e?.message ?? "No se pudo guardar la fecha");
    } finally {
      setGuardando(false);
    }
  };

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
    // replace y no push: si quedara en el historial, el botón de atrás del
    // navegador devolvería a esta pantalla con la sesión ya cerrada.
    router.replace("/");
  };

  const borrarCuenta = async () => {
    const seguro = await confirmar(
      "Borrar tu cuenta",
      `Se borra ${usuario?.mail ?? "tu cuenta"} con TODO lo tuyo: ` +
        `${pastillas.length} ${pastillas.length === 1 ? "pastilla" : "pastillas"}, ` +
        `sus dosis, tu historial de dispensaciones, tus contactos y tus actividades.\n\n` +
        `El pastillero deja de dispensarte.\n\n` +
        `Esto no se puede deshacer y no hay forma de recuperarlo. ¿Seguro?`,
      "Borrar mi cuenta",
      "peligro"
    );
    if (!seguro) return;

    setBorrando(true);
    setError("");
    try {
      await borrarMiCuenta();
      cerrarSesion();
      router.replace("/");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo borrar la cuenta");
      setBorrando(false);
    }
  };

  return (
    <Pantalla angosta>
      <Encabezado titulo="Tu perfil" volverA="/home" />

      <Aviso texto={error} />

      {/* QUIÉN SOS, EN UNA LÍNEA. */}
      <View style={styles.identidad}>
        <View style={styles.inicial}>
          <Text style={styles.inicialTexto}>{inicialesDe(usuario)}</Text>
        </View>

        <View style={styles.identidadTextos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : "Tu cuenta"}
          </Text>
          <Text style={styles.mail} numberOfLines={1} selectable>
            {usuario?.mail ?? "—"}
          </Text>
        </View>
      </View>

      {/* LO QUE SE VIENE. Primero, porque es a lo que se entra a mirar. */}
      {proximaGeneral && (
        <Tarjeta destacada etiqueta="Lo próximo">
          <Text style={styles.proxima}>
            {comoHora(proximaGeneral.hora, proximaGeneral.minuto)}
          </Text>
          <Text style={styles.proximaDetalle}>
            {proximaGeneral.pastillas?.nombre ?? "Una dosis"} ·{" "}
            {fechaRelativa(proximaGeneral.dia)}
          </Text>
        </Tarjeta>
      )}

      {/* TUS PASTILLAS */}
      <Text style={styles.seccion}>Tus pastillas</Text>

      {cargando ? (
        <Cargando texto="Buscando tus pastillas..." />
      ) : pastillas.length === 0 ? (
        <Vacio
          titulo="Todavía no cargaste ninguna"
          detalle="Cuando agregues una pastilla, acá vas a ver su estado y cuándo le toca."
          accion={{
            titulo: "Agregar una pastilla",
            onPress: () => router.push("/agregar-medicacion"),
          }}
        />
      ) : (
        pastillas.map((p) => {
          const proxima = proximaPorPastilla.get(p.id) ?? null;
          const quedan = p.modulo?.cantidad_actual ?? null;

          return (
            <Tarjeta key={p.id}>
              <Text style={styles.pastilla}>{p.nombre}</Text>

              <View style={styles.estados}>
                {proxima ? (
                  <Estado
                    texto={`${comoHora(proxima.hora, proxima.minuto)} · ${fechaRelativa(proxima.dia)}`}
                    tono="ok"
                    icono="time-outline"
                  />
                ) : (
                  <Estado texto="Sin dosis agendadas" tono="neutro" icono="time-outline" />
                )}

                {/* El stock sale del módulo donde está cargada ESTA pastilla:
                    cada módulo tiene su tolva y su filtro, así que el número es
                    de ella. Si no está cargada en ninguno, no se muestra nada. */}
                {quedan !== null && (
                  <Estado
                    texto={`Quedan ${quedan}`}
                    tono={quedan === 0 ? "atencion" : "neutro"}
                    icono="medkit-outline"
                  />
                )}
              </View>
            </Tarjeta>
          );
        })
      )}

      {/* TUS DATOS. Después de las pastillas porque se miran mucho menos. */}
      <Text style={styles.seccion}>Tus datos</Text>

      <Tarjeta>
        {editando ? (
          <>
            <CampoFechaNacimiento
              valor={fechaNueva}
              alCambiar={setFechaNueva}
              error={errorFecha}
              ayuda="Se guarda al tocar Guardar."
            />

            <View style={styles.filaBotones}>
              <Boton
                titulo="Cancelar"
                variante="secundario"
                ancho="auto"
                onPress={() => setEditando(false)}
              />
              <Boton
                titulo="Guardar"
                ancho="auto"
                onPress={guardarFecha}
                cargando={guardando}
              />
            </View>
          </>
        ) : (
          <View>
            <Text style={styles.datoEtiqueta}>Fecha de nacimiento</Text>
            <Text style={styles.datoValor}>
              {usuario?.fecha_nacimiento
                ? fechaConAnio(usuario.fecha_nacimiento)
                : "Sin completar"}
            </Text>
            {edad !== null && <Text style={styles.datoEdad}>{edad} años</Text>}

            {/* El boton va ABAJO y a lo ancho, no al lado.
                Al lado apretaba el texto y la fecha se partia en dos lineas
                ("3 de noviembre de / 1956"), que es justo lo que no hay que
                hacerle a un dato que se lee de un vistazo. Ademas a lo ancho
                es mas facil de tocar, que es como se usa esto. */}
            <Boton
              titulo="Cambiar la fecha"
              variante="secundario"
              icono="create-outline"
              onPress={empezarAEditar}
              ayuda="Editar tu fecha de nacimiento"
              estilo={styles.botonCambiar}
            />
          </View>
        )}
      </Tarjeta>

      {/* LAS DOS SALIDAS, AL FINAL Y SEPARADAS DEL RESTO. */}
      <Text style={styles.seccion}>Tu cuenta</Text>

      <View style={styles.salidas}>
        <Boton
          titulo="Cerrar sesión"
          variante="secundario"
          icono="log-out-outline"
          onPress={salir}
          ayuda="Vas a tener que iniciar sesión de nuevo para volver"
        />

        <Boton
          titulo="Borrar mi cuenta"
          variante="peligro"
          icono="trash-outline"
          onPress={borrarCuenta}
          cargando={borrando}
          ayuda="Se borra todo lo tuyo y no se puede deshacer"
        />
      </View>
    </Pantalla>
  );
}

// Las iniciales para el circulito. Es decoracion: el nombre esta escrito al
// lado, asi que si sale vacio no se pierde nada.
const inicialesDe = (u: Usuario | null): string => {
  if (!u) return "?";
  const a = u.nombre?.trim()?.[0] ?? "";
  const b = u.apellido?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
};

const useEstilos = crearEstilos((colores) => ({
  identidad: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
    marginBottom: espacio.lg,
  },

  inicial: {
    width: 52,
    height: 52,
    borderRadius: radio.redondo,
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    alignItems: "center",
    justifyContent: "center",
  },

  inicialTexto: {
    ...texto.item,
    color: colores.acento,
  },

  identidadTextos: {
    flex: 1,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
  },

  mail: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  proxima: {
    ...texto.hora,
    color: colores.acento,
  },

  proximaDetalle: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  seccion: {
    ...texto.seccion,
    color: colores.texto,
    marginTop: espacio.xl,
    marginBottom: espacio.sm,
  },

  pastilla: {
    ...texto.item,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
  },

  datoEtiqueta: {
    ...texto.etiqueta,
    color: colores.textoTenue,
  },

  datoValor: {
    ...texto.cuerpo,
    color: colores.texto,
  },

  datoEdad: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  botonCambiar: {
    marginTop: espacio.lg,
  },

  filaBotones: {
    flexDirection: "row",
    gap: espacio.md,
    marginTop: espacio.lg,
  },

  // Separadas del resto con aire: son las dos cosas de esta pantalla que no se
  // pueden deshacer de un toque.
  salidas: {
    gap: espacio.md,
    marginBottom: espacio.xl,
  },
}));
