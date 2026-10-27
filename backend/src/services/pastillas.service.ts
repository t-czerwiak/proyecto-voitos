import { supabase } from "../config/supabase";
import { PastillaCreate, PastillaUpdate } from "../schemas/pastillas.schema";
import { asignarPastillaAModulo, getModuloCompartido } from "./modulos.service";
import { esMio } from "./pastilleros.service";
import { ErrorHttp } from "../utils/errores";

const conModulo = (fila: any, compartido: any = null) => {
  const { modulos, ...pastilla } = fila;
  return { ...pastilla, modulo: modulos?.[0] ?? compartido };
};

export const getAllPastillas = async (usuario_id?: string) => {
  let query = supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual, dispositivo_id)");

  if (usuario_id) query = query.eq("usuario_id", usuario_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const filas = data ?? [];
  const compartidos = new Map<string, any>();
  if (usuario_id) {
    for (const d of new Set(filas.filter((f: any) => !f.modulos?.length).map((f: any) => f.dispositivo_id ?? ""))) {
      compartidos.set(d, await getModuloCompartido(usuario_id, d || null));
    }
  }
  return filas.map((fila: any) => conModulo(fila, compartidos.get(fila.dispositivo_id ?? "") ?? null));
};

export const getPastillaById = async (id: string, usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual, dispositivo_id)")
    .eq("id", id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? conModulo(data, await getModuloCompartido(usuario_id, data.dispositivo_id)) : null;
};

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

export const createPastilla = async (body: PastillaCreate) => {
  const { cantidad_inicial, modulo_numero, ...datosPastilla } = body;

  if (datosPastilla.dispositivo_id && !(await esMio(datosPastilla.usuario_id, datosPastilla.dispositivo_id))) {
    throw new ErrorHttp(404, "Pastillero no encontrado");
  }

  const { data, error } = await supabase
    .from("pastillas")
    .insert(datosPastilla)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const modulo =
    cantidad_inicial === undefined
      ? null
      : await asignarPastillaAModulo(
          data.id,
          cantidad_inicial,
          datosPastilla.usuario_id,
          modulo_numero,
          datosPastilla.dispositivo_id
        );

  return {
    ...data,
    modulo: modulo ?? (await getModuloCompartido(datosPastilla.usuario_id, datosPastilla.dispositivo_id)),
  };
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
