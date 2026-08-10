import { supabase } from "../config/supabase";
import { ModuloUpdate } from "../schemas/modulos.schema";

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
