import { supabase } from "../config/supabase";
import { ModuloUpdate } from "../schemas/modulos.schema";
import { ErrorHttp } from "../utils/errores";

// EL PASTILLERO TIENE UN SOLO MODULO.
//
// Antes esto estaba escrito como si hubiera muchos: cada pastilla se "asignaba"
// a un modulo y, cuando no habia ninguno libre, se creaba uno nuevo. Como
// ninguno se liberaba nunca, la tabla termino con ocho modulos —uno por
// pastilla— todos apuntando a la misma placa. Eso no existe: hay una sola
// ESP32, con un solo servo.
//
// Ahora hay un modulo y es compartido. Cualquier dosis, de cualquier pastilla y
// de cualquier cuenta, dispensa por el. cantidad_actual es literalmente
// "cuantas pastillas hay adentro de la maquina ahora", sin importar de cual
// sean: el que carga la tolva sabe que puso.
//
// Cuando haya una segunda placa, esto vuelve a necesitar el vinculo
// pastilla-modulo. Mientras haya una sola, fingir que hay varios es lo que
// confunde.
const NUMERO_UNICO = 1;

// El modulo, el unico que hay.
//
// Devuelve null si la tabla esta vacia, que no deberia pasar nunca: la fila
// existe desde la migracion. Se devuelve null en vez de explotar porque quien
// llama ya sabe manejar "no hay modulo" —es el mismo caso que antes era "esta
// pastilla no esta cargada en ninguno"— y una dosis no tiene por que fallar
// entera por esto.
export const getModulo = async () => {
  const { data, error } = await supabase
    .from("modulos")
    .select("id, numero, nombre, cantidad_actual, dispositivo_id")
    .eq("numero", NUMERO_UNICO)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const getAllModulos = async (dispositivo_id?: string) => {
  let query = supabase
    .from("modulos")
    .select("*")
    .order("numero", { ascending: true });

  if (dispositivo_id) query = query.eq("dispositivo_id", dispositivo_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getModuloById = async (id: string) => {
  const { data, error } = await supabase
    .from("modulos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// El cuidador registra cuantas pastillas cargo.
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

// Deja anotado cuantas pastillas hay cargadas en la maquina.
//
// PISA el numero anterior, no suma. Es lo que corresponde: quien carga la tolva
// la vacia y pone lo nuevo, no apila encima de lo que habia. Para sumar o
// corregir sin vaciar esta ajustarStock().
export const cargarModulo = async (cantidad: number) => {
  const modulo = await getModulo();

  if (!modulo) {
    throw new ErrorHttp(
      409,
      "No hay ningun modulo configurado en el pastillero."
    );
  }

  return await updateModulo(modulo.id, { cantidad_actual: cantidad });
};

// Suma o resta stock del modulo.
//
// El delta viene con signo: +10 es una recarga, -3 corrige un conteo. Nunca
// baja de cero, igual que descontarDelModulo, para no romper el check de la
// base cuando el numero real y el anotado se desincronizan.
export const ajustarStock = async (delta: number) => {
  const modulo = await getModulo();

  if (!modulo) {
    throw new ErrorHttp(
      409,
      "No hay ningun modulo configurado en el pastillero, asi que no hay stock que ajustar."
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
