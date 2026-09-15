import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  getUsuarioActual,
  refrescarUsuario,
  cerrarSesion,
  borrarMiCuenta,
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
} from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

// El perfil: quien sos, que tenés cargado, y las dos puertas de salida.
//
// Las dos puertas —cerrar sesión y borrar la cuenta— viven SOLO acá. Antes
// "Cerrar sesión" estaba al final del inicio, que es la pantalla que se abre
// veinte veces por día, y no hay ningún motivo para tener a mano el botón que
// te obliga a escribir mail y contraseña de nuevo. Las cosas que se hacen una
// vez cada mucho van juntas y en un lugar al que hay que ir a propósito.
export default function Perfil() {
  const styles = useEstilos();

  const [usuario, setUsuario] = useState<Usuario | null>(getUsuarioActual());
  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(false);

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

  // La próxima dosis de CADA pastilla, no la próxima en general: en esta
  // pantalla lo que se mira es "¿esta pastilla está andando?", una por una.
  const proximaPorPastilla = useMemo(() => {
    const mapa = new Map<string, Horario | null>();
    for (const p of pastillas) {
      mapa.set(p.id, proximaDosis(horarios.filter((h) => h.pastilla_id === p.id)));
    }
    return mapa;
  }, [pastillas, horarios]);

  const proximaGeneral = useMemo(() => proximaDosis(horarios), [horarios]);

  const edad = edadDesde(usuario?.fecha_nacimiento);

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

      {/* QUIÉN SOS */}
      <Tarjeta destacada>
        <Text style={styles.nombre}>
          {usuario ? `${usuario.nombre} ${usuario.apellido}` : "Tu cuenta"}
        </Text>

        <Dato etiqueta="Mail" valor={usuario?.mail ?? "—"} />

        <Dato
          etiqueta="Fecha de nacimiento"
          valor={
            usuario?.fecha_nacimiento
              ? `${fechaConAnio(usuario.fecha_nacimiento)}${edad !== null ? ` · ${edad} años` : ""}`
              : "Sin completar"
          }
        />
      </Tarjeta>

      {/* LA PRÓXIMA DOSIS, DE TODAS */}
      {proximaGeneral && (
        <Tarjeta etiqueta="Tu próxima dispensación">
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

                {/* El stock sale del modulo donde esta cargada ESTA pastilla:
                    cada modulo tiene su tolva y su filtro, asi que el numero es
                    de ella. Si no esta cargada en ninguno, no se muestra nada. */}
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

      {/* LAS DOS PUERTAS DE SALIDA, AL FINAL Y SEPARADAS */}
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

// Una etiqueta con su valor debajo. La etiqueta va escrita siempre, nunca
// deducida de la forma del dato: "1986-09-16" solo no dice que es.
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const styles = useEstilos();
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor} selectable>
        {valor}
      </Text>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  nombre: {
    ...texto.titulo,
    color: colores.texto,
    marginBottom: espacio.md,
  },

  dato: {
    marginTop: espacio.md,
  },

  datoEtiqueta: {
    ...texto.etiqueta,
    color: colores.textoTenue,
  },

  datoValor: {
    ...texto.cuerpo,
    color: colores.texto,
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

  // Separadas del resto con aire: son las dos cosas de esta pantalla que no
  // se pueden deshacer de un toque.
  salidas: {
    marginTop: espacio.xxxl,
    gap: espacio.md,
  },
}));
