import { supabase } from "../config/supabase";
import { ModuloUpdate } from "../schemas/modulos.schema";
import { ErrorHttp } from "../utils/errores";

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
    .select("id, numero, cantidad_actual")
    .eq("pastilla_id", pastilla_id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// El cuidador registra cuantas pastillas cargo, o cambia que pastilla tiene
// puesta el modulo.
export const updateModulo = async (id: string, body: ModuloUpdate) => {
  const { data, error } = await supabase
    .from("modulos")
    .update(body)
    .eq("id", id)
    .select()
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
// El criterio de que modulo usar sale de como es el pastillero fisico: hay un
// modulo por servo, y cada uno dispensa una sola pastilla porque el filtro es
// especifico. Asi que se busca uno libre antes de inventar uno nuevo, y recien
// si no hay se agrega el siguiente numero.
//
// Devuelve el modulo asignado para que el que llama pueda mostrar en que
// numero quedo, que si no es adivinanza para el cuidador.
export const asignarPastillaAModulo = async (
  pastilla_id: string,
  cantidad: number,
  numeroPedido?: number
) => {
  // Si piden un modulo concreto se respeta, aunque ya tenga otra pastilla:
  // fisicamente cambiar la tolva y el filtro es justamente eso.
  if (numeroPedido !== undefined) {
    const { data: existente } = await supabase
      .from("modulos")
      .select("id")
      .eq("numero", numeroPedido)
      .limit(1)
      .maybeSingle();

    if (existente) {
      return await updateModulo(existente.id, {
        pastilla_id,
        cantidad_actual: cantidad,
      });
    }

    return await crearModulo(numeroPedido, pastilla_id, cantidad);
  }

  // Sin pedido explicito: el modulo libre de numero mas bajo.
  const { data: libre } = await supabase
    .from("modulos")
    .select("id")
    .is("pastilla_id", null)
    .order("numero", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (libre) {
    return await updateModulo(libre.id, {
      pastilla_id,
      cantidad_actual: cantidad,
    } as ModuloUpdate);
  }

  // No hay ninguno libre: se agrega el siguiente numero.
  const { data: ultimo } = await supabase
    .from("modulos")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();

  return await crearModulo((ultimo?.numero ?? 0) + 1, pastilla_id, cantidad);
};

const crearModulo = async (numero: number, pastilla_id: string, cantidad: number) => {
  const { data, error } = await supabase
    .from("modulos")
    .insert({ numero, pastilla_id, cantidad_actual: cantidad })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
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
    .select("id, numero, cantidad_actual")
    .single();

  if (error) throw new Error(error.message);
  return data;
};
