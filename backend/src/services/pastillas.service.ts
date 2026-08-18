import { supabase } from "../config/supabase";
import { PastillaCreate, PastillaUpdate } from "../schemas/pastillas.schema";
import { asignarPastillaAModulo } from "./modulos.service";

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

export const getPastillaById = async (id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return conModulo(data);
};

// Al crear una pastilla se la deja cargada en un modulo con su stock inicial.
//
// Antes la cantidad del formulario terminaba en el texto de caracteristicas,
// asi que la pastilla nacia sin modulo: no se podia dispensar ni descontar
// stock. Ahora cantidad_inicial va al modulo, que es donde el resto del
// sistema la busca.
export const createPastilla = async (body: PastillaCreate) => {
  const { cantidad_inicial, modulo_numero, ...datosPastilla } = body;

  const { data, error } = await supabase
    .from("pastillas")
    .insert(datosPastilla)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (cantidad_inicial === undefined) return { ...data, modulo: null };

  const modulo = await asignarPastillaAModulo(
    data.id,
    cantidad_inicial,
    modulo_numero
  );

  return { ...data, modulo };
};

export const updatePastilla = async (id: string, body: PastillaUpdate) => {
  const { cantidad_inicial, modulo_numero, ...datosPastilla } = body;

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
