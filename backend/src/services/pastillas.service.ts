import { supabase } from "../config/supabase";
import { PastillaCreate, PastillaUpdate } from "../schemas/pastillas.schema";
import { cargarModulo } from "./modulos.service";

// Supabase devuelve la relacion modulos como array porque la FK va de modulos
// a pastillas. Para la app es mas comodo un solo modulo (o null): una pastilla
// vive en un modulo a la vez, que es la restriccion fisica del pastillero.
const conModulo = (fila: any) => {
  const { modulos, ...pastilla } = fila;
  return { ...pastilla, modulo: modulos?.[0] ?? null };
};

// El modulo viaja pegado a la pastilla porque la pantalla de agendar necesita
// el stock para avisar si alcanza, y pedirlo aparte serian N consultas mas.
export const getAllPastillas = async (usuario_id?: string) => {
  let query = supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual)");

  if (usuario_id) query = query.eq("usuario_id", usuario_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(conModulo);
};

// El usuario_id no es opcional a proposito: filtrar por dueño es lo que impide
// que alguien lea una pastilla ajena poniendo su id en la URL. Devuelve null si
// no existe O si es de otro, para no revelar cuales existen.
export const getPastillaById = async (id: string, usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual)")
    .eq("id", id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? conModulo(data) : null;
};

// Verifica que la pastilla sea del usuario antes de dejar operar sobre ella.
// Se usa en update, delete y en todo lo que reciba un id por la URL.
export const esDelUsuario = async (id: string, usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("id")
    .eq("id", id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
};

// Al crear una pastilla, si se dice cuantas se cargaron, eso queda anotado en
// el modulo.
//
// OJO: el pastillero tiene UN modulo y es compartido, asi que cantidad_inicial
// PISA lo que hubiera. Es lo que corresponde fisicamente —cargar la tolva es
// vaciarla y poner lo nuevo— pero significa que crear una pastilla diciendo
// "20" borra el conteo anterior. Ver services/modulos.service.ts.
export const createPastilla = async (body: PastillaCreate) => {
  const { cantidad_inicial, ...datosPastilla } = body;

  const { data, error } = await supabase
    .from("pastillas")
    .insert(datosPastilla)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (cantidad_inicial === undefined) return { ...data, modulo: null };

  const modulo = await cargarModulo(cantidad_inicial);

  return { ...data, modulo };
};

export const updatePastilla = async (id: string, body: PastillaUpdate) => {
  const { cantidad_inicial, ...datosPastilla } = body;

  const { data, error } = await supabase
    .from("pastillas")
    .update(datosPastilla)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deletePastilla = async (id: string) => {
  const { error } = await supabase.from("pastillas").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const getHorariosByPastilla = async (id: string) => {
  const { data, error } = await supabase
    .from("horarios")
    .select("*")
    .eq("pastilla_id", id)
    .order("dia", { ascending: true })
    .order("hora", { ascending: true })
    .order("minuto", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

// Cancela una rutina: borra las dosis que todavia no salieron.
//
// Los filtros son necesarios porque una pastilla puede tener varias rutinas a
// la vez (la misma aspirina a las 8 y a las 20). Sin hora y minuto, borrar una
// se llevaria puestas las otras. El rango de fechas separa dos rutinas del
// mismo horario agendadas en periodos distintos.
//
// Las ya dispensadas NO se tocan: son el historial de lo que salio del
// pastillero, y ademas borrarlas se llevaria las filas de dispensaciones, que
// cuelgan de horarios con ON DELETE CASCADE.
export const cancelarRutina = async (
  pastilla_id: string,
  filtros: { hora?: number; minuto?: number; desde?: string; hasta?: string } = {}
) => {
  let query = supabase
    .from("horarios")
    .delete()
    .eq("pastilla_id", pastilla_id)
    .eq("dispensado", false);

  if (filtros.hora !== undefined) query = query.eq("hora", filtros.hora);
  if (filtros.minuto !== undefined) query = query.eq("minuto", filtros.minuto);
  if (filtros.desde) query = query.gte("dia", filtros.desde);
  if (filtros.hasta) query = query.lte("dia", filtros.hasta);

  const { data, error } = await query.select("id");

  if (error) throw new Error(error.message);
  return { canceladas: data?.length ?? 0 };
};
