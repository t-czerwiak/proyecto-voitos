import { supabase } from "../config/supabase";
import { ModuloUpdate } from "../schemas/modulos.schema";
import { ErrorHttp } from "../utils/errores";

// UN MODULO ES UNA PIEZA DE HARDWARE. EL SOFTWARE NO LOS INVENTA.
//
// Cada modulo es un servo con su tolva y su filtro, y el filtro es especifico
// de una pastilla: por eso un modulo dispensa una sola. Una ESP32 puede manejar
// VARIOS modulos. Hoy hay uno solo armado, "voitos_1", pero no porque la placa
// no pueda con mas.
//
// Lo que estaba mal era esto: al cargar una pastilla se buscaba un modulo libre
// y, si no habia ninguno, se CREABA uno nuevo con el siguiente numero. Como
// ninguno se liberaba, cada pastilla nueva inventaba una pieza de hardware que
// no existe. La tabla llego a tener ocho modulos para una maquina que tiene
// uno, y el numero que se le manda a la ESP32 —el que usa para elegir el
// servo— podia ser el 7 en una placa que solo tiene el 1.
//
// Ahora no se crean modulos nunca. Si no hay ninguno libre, la pastilla queda
// registrada y sin cargar, que es exactamente lo que pasa en la realidad: no
// hay donde ponerla hasta que se libere una tolva o se arme otro modulo.
//
// Los modulos se dan de alta a mano en la base cuando se arma el hardware.

// Las columnas que se devuelven de un modulo.
//
// nombre es como lo llama el equipo ("voitos_1"). dispositivo_id es lo que
// manda el firmware ("ESP32-001") y tiene que coincidir con lo que la placa
// tiene escrito adentro, asi que no se toca desde la aplicacion.
const CAMPOS = "id, numero, nombre, pastilla_id, cantidad_actual, dispositivo_id";

export const getAllModulos = async (dispositivo_id?: string) => {
  let query = supabase
    .from("modulos")
    .select("*, pastillas(id, nombre, tipo)")
    .order("numero", { ascending: true });

  if (dispositivo_id) query = query.eq("dispositivo_id", dispositivo_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getModuloById = async (id: string) => {
  const { data, error } = await supabase
    .from("modulos")
    .select("*, pastillas(id, nombre, tipo)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Que modulo tiene cargada esta pastilla. Es lo que la ESP32 necesita saber
// para elegir el servo, y de donde sale el stock disponible.
export const getModuloDePastilla = async (pastilla_id: string) => {
  const { data, error } = await supabase
    .from("modulos")
    .select("id, numero, nombre, cantidad_actual")
    .eq("pastilla_id", pastilla_id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// El cuidador registra cuantas pastillas cargo, o cambia que pastilla tiene
// puesta el modulo. Cambiar la pastilla es lo que se hace al cambiar la tolva
// y el filtro.
export const updateModulo = async (id: string, body: ModuloUpdate) => {
  const { data, error } = await supabase
    .from("modulos")
    .update(body)
    .eq("id", id)
    .select(CAMPOS)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Resta lo que se dispenso. Nunca baja de cero: si por algun motivo el stock
// quedo desactualizado, se corta en 0 en vez de romper el check de la base.
export const descontarDelModulo = async (moduloId: string, cantidad: number) => {
  const { data: modulo, error: errorLectura } = await supabase
    .from("modulos")
    .select("cantidad_actual")
    .eq("id", moduloId)
    .maybeSingle();

  if (errorLectura) throw new Error(errorLectura.message);
  if (!modulo) return null;

  const nuevaCantidad = Math.max(0, modulo.cantidad_actual - cantidad);

  const { data, error } = await supabase
    .from("modulos")
    .update({ cantidad_actual: nuevaCantidad })
    .eq("id", moduloId)
    .select("cantidad_actual")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.cantidad_actual ?? null;
};

// Deja una pastilla cargada en un modulo, con su stock inicial.
//
// Devuelve null si no habia donde ponerla. No es un error: la pastilla queda
// registrada y sin cargar, que es lo que pasa cuando todas las tolvas estan
// ocupadas. Para cargarla igual hay que liberar un modulo o cambiarle la
// pastilla desde PUT /api/modulos/:id, que es el equivalente a cambiar la tolva.
export const asignarPastillaAModulo = async (
  pastilla_id: string,
  cantidad: number,
  numeroPedido?: number
) => {
  // Si piden un modulo concreto se respeta, aunque ya tenga otra pastilla:
  // fisicamente cambiar la tolva y el filtro es justamente eso.
  //
  // Si ese numero no existe se responde 409 en vez de crearlo. Pedir el modulo
  // 3 en un pastillero que tiene uno solo es un error de quien lo pide, y
  // crearlo dejaria a la ESP32 recibiendo un numero de servo que no tiene.
  if (numeroPedido !== undefined) {
    const { data: existente } = await supabase
      .from("modulos")
      .select("id")
      .eq("numero", numeroPedido)
      .limit(1)
      .maybeSingle();

    if (!existente) {
      throw new ErrorHttp(
        409,
        `El pastillero no tiene un modulo ${numeroPedido}. Los modulos se arman a mano, no se crean desde la aplicacion.`
      );
    }

    return await updateModulo(existente.id, {
      pastilla_id,
      cantidad_actual: cantidad,
    });
  }

  // Sin pedido explicito: el modulo libre de numero mas bajo.
  const { data: libre } = await supabase
    .from("modulos")
    .select("id")
    .is("pastilla_id", null)
    .order("numero", { ascending: true })
    .limit(1)
    .maybeSingle();

  // No hay ninguno libre. ANTES ACA SE CREABA UNO NUEVO, y de ahi salieron los
  // ocho modulos de una maquina que tiene uno.
  if (!libre) return null;

  return await updateModulo(libre.id, {
    pastilla_id,
    cantidad_actual: cantidad,
  });
};

// Suma o resta stock del modulo donde esta cargada la pastilla.
//
// El delta viene con signo: +10 es una recarga, -3 corrige un conteo. Nunca
// baja de cero, igual que descontarDelModulo, para no romper el check de la
// base cuando el numero real y el anotado se desincronizan.
export const ajustarStockDePastilla = async (pastilla_id: string, delta: number) => {
  const modulo = await getModuloDePastilla(pastilla_id);

  if (!modulo) {
    throw new ErrorHttp(
      409,
      "Esa pastilla no esta cargada en ningun modulo, asi que no tiene stock que ajustar."
    );
  }

  const nuevaCantidad = Math.max(0, modulo.cantidad_actual + delta);

  const { data, error } = await supabase
    .from("modulos")
    .update({ cantidad_actual: nuevaCantidad })
    .eq("id", modulo.id)
    .select("id, numero, nombre, cantidad_actual")
    .single();

  if (error) throw new Error(error.message);
  return data;
};
