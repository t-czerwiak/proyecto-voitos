import React, { useState } from "react";
import { Text, View } from "react-native";
import Avatar from "./Avatar";
import type { Usuario } from "../lib/api";
import {
  cambiarFechaNacimiento,
  cambiarNombre,
  cambiarPassword,
  quitarFoto,
  subirFoto,
} from "../lib/voitos";
import { elegirFoto, sePuedeElegirFoto } from "../lib/foto";
import { edadDesde, fechaConAnio } from "../lib/fechas";
import { Aviso, Boton, Campo, CampoFechaNacimiento, Tarjeta } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

type Editando = null | "nombre" | "fecha" | "clave";

type Props = {
  usuario: Usuario | null;
  alCambiar: (u: Usuario) => void;
};

export default function TusDatos({ usuario, alCambiar }: Props) {
  const styles = useEstilos();

  const [editando, setEditando] = useState<Editando>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");
  const [cargandoFoto, setCargandoFoto] = useState(false);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fecha, setFecha] = useState("");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  const edad = edadDesde(usuario?.fecha_nacimiento);

  const abrir = (que: Editando) => {
    setError("");
    setListo("");
    setNombre(usuario?.nombre ?? "");
    setApellido(usuario?.apellido ?? "");
    setFecha(usuario?.fecha_nacimiento ?? "");
    setActual("");
    setNueva("");
    setRepetida("");
    setEditando(que);
  };

  const guardar = async (accion: () => Promise<Usuario | void>, mensaje: string) => {
    setGuardando(true);
    setError("");
    try {
      const actualizado = await accion();
      if (actualizado) alCambiar(actualizado);
      setEditando(null);
      setListo(mensaje);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const guardarNombre = () => {
    if (!nombre.trim() || !apellido.trim()) {
      setError("Completá el nombre y el apellido.");
      return;
    }
    guardar(() => cambiarNombre(nombre.trim(), apellido.trim()), "Listo, cambiaste tu nombre.");
  };

  const guardarFecha = () => {
    if (!fecha) {
      setError("Elegí el día, el mes y el año.");
      return;
    }
    guardar(() => cambiarFechaNacimiento(fecha), "Listo, cambiaste tu fecha de nacimiento.");
  };

  const guardarClave = () => {
    if (nueva.length < 6) {
      setError("La contraseña nueva tiene que tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== repetida) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    guardar(() => cambiarPassword(actual, nueva), "Listo, cambiaste tu contraseña.");
  };

  const cambiarFoto = async () => {
    setError("");
    setListo("");
    try {
      const imagen = await elegirFoto();
      if (!imagen) return;
      setCargandoFoto(true);
      alCambiar({ ...(await subirFoto(imagen)), foto_url: imagen });
    } catch (e: any) {
      setError(e?.message ?? "No se pudo subir la foto");
    } finally {
      setCargandoFoto(false);
    }
  };

  const sacarFoto = async () => {
    setError("");
    setListo("");
    setCargandoFoto(true);
    try {
      alCambiar(await quitarFoto());
    } catch (e: any) {
      setError(e?.message ?? "No se pudo quitar la foto");
    } finally {
      setCargandoFoto(false);
    }
  };

  const botones = (alGuardar: () => void) => (
    <View style={styles.filaBotones}>
      <Boton titulo="Cancelar" variante="secundario" ancho="auto" onPress={() => setEditando(null)} />
      <Boton titulo="Guardar" ancho="auto" onPress={alGuardar} cargando={guardando} />
    </View>
  );

  return (
    <Tarjeta>
      <View style={styles.caja}>
        <Aviso texto={error} />
        <Aviso texto={listo} tipo="ok" />

        {sePuedeElegirFoto && (
          <View style={styles.fila}>
            <Avatar usuario={usuario} tam={64} />
            <View style={styles.textos}>
              <Text style={styles.etiqueta}>Foto de perfil</Text>
              <View style={styles.filaAcciones}>
                <Boton
                  titulo={usuario?.foto_url ? "Cambiar" : "Poner una foto"}
                  variante="secundario"
                  ancho="auto"
                  icono="image-outline"
                  onPress={cambiarFoto}
                  cargando={cargandoFoto}
                />
                {usuario?.foto_url && (
                  <Boton titulo="Quitar" variante="enlace" ancho="auto" onPress={sacarFoto} />
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Nombre</Text>
          {editando === "nombre" ? (
            <>
              <Campo etiqueta="Nombre" valor={nombre} alCambiar={setNombre} autoCompletar="given-name" />
              <Campo etiqueta="Apellido" valor={apellido} alCambiar={setApellido} autoCompletar="family-name" />
              {botones(guardarNombre)}
            </>
          ) : (
            <View style={styles.filaDato}>
              <Text style={[styles.valor, styles.crece]}>
                {usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : "—"}
              </Text>
              <Boton titulo="Cambiar" variante="enlace" ancho="auto" onPress={() => abrir("nombre")} />
            </View>
          )}
        </View>

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Fecha de nacimiento</Text>
          {editando === "fecha" ? (
            <>
              <CampoFechaNacimiento valor={fecha} alCambiar={setFecha} ayuda="Se guarda al tocar Guardar." />
              {botones(guardarFecha)}
            </>
          ) : (
            <View style={styles.filaDato}>
              <View style={styles.crece}>
                <Text style={styles.valor}>
                  {usuario?.fecha_nacimiento ? fechaConAnio(usuario.fecha_nacimiento) : "Sin completar"}
                </Text>
                {edad !== null && <Text style={styles.detalle}>{edad} años</Text>}
              </View>
              <Boton titulo="Cambiar" variante="enlace" ancho="auto" onPress={() => abrir("fecha")} />
            </View>
          )}
        </View>

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Contraseña</Text>
          {editando === "clave" ? (
            <>
              <Campo etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} secreto autoCompletar="current-password" />
              <Campo
                etiqueta="Contraseña nueva"
                valor={nueva}
                alCambiar={setNueva}
                secreto
                autoCompletar="new-password"
                ayuda="Al menos 6 caracteres."
              />
              <Campo etiqueta="Repetí la nueva" valor={repetida} alCambiar={setRepetida} secreto autoCompletar="new-password" />
              {botones(guardarClave)}
            </>
          ) : (
            <View style={styles.filaDato}>
              <Text style={[styles.valor, styles.crece]}>••••••••</Text>
              <Boton titulo="Cambiar" variante="enlace" ancho="auto" onPress={() => abrir("clave")} />
            </View>
          )}
        </View>
      </View>
    </Tarjeta>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    flex: 1,
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.lg,
    paddingBottom: espacio.lg,
  },

  textos: {
    flex: 1,
  },

  filaAcciones: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: espacio.sm,
    marginTop: espacio.sm,
  },

  bloque: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingVertical: espacio.lg,
  },

  filaDato: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espacio.md,
  },

  etiqueta: {
    ...texto.etiqueta,
    color: colores.textoTenue,
    marginBottom: espacio.xs,
  },

  valor: {
    ...texto.cuerpo,
    color: colores.texto,
    flexShrink: 1,
  },

  crece: {
    flex: 1,
  },

  detalle: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  filaBotones: {
    flexDirection: "row",
    gap: espacio.md,
    marginTop: espacio.sm,
  },
}));
