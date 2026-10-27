import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabase } from "../config/supabase";
import { ErrorHttp } from "../utils/errores";

const MINUTOS_CODIGO = 30;

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

const iguales = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const codigoNuevo = () => String(randomInt(0, 100_000_000)).padStart(8, "0");

export interface Alcance {
  duenos: string[];
  ajenos: string[];
  dispositivo?: string;
}

const vinculos = async () => {
  const { data, error } = await supabase.from("pastillero_usuarios").select("dispositivo_id, usuario_id");
  if (error) throw new Error(error.message);
  return data;
};

export const alcanceDe = async (dispositivo_id?: string): Promise<Alcance> => {
  const todos = await vinculos();
  const duenos = todos.filter((v) => v.dispositivo_id === dispositivo_id).map((v) => v.usuario_id as string);
  return {
    duenos,
    ajenos: duenos.length ? [] : [...new Set(todos.map((v) => v.usuario_id as string))],
    dispositivo: dispositivo_id,
  };
};

export const soloDeEstePastillero = (consulta: any, a: Alcance) =>
  a.dispositivo
    ? consulta.or(`dispositivo_id.is.null,dispositivo_id.eq.${a.dispositivo}`, { referencedTable: "pastillas" })
    : consulta;

export const filtrarPorAlcance = (consulta: any, a: Alcance, columna: string) => {
  if (a.duenos.length) return consulta.in(columna, a.duenos);
  if (a.ajenos.length) return consulta.not(columna, "in", `(${a.ajenos.join(",")})`);
  return consulta;
};

export const dispositivosAjenos = async (usuario_id: string): Promise<string[]> => {
  const todos = await vinculos();
  const mios = new Set(todos.filter((v) => v.usuario_id === usuario_id).map((v) => v.dispositivo_id));
  return [...new Set(todos.map((v) => v.dispositivo_id))].filter((d) => !mios.has(d));
};

export const vinculoParaPlaca = async (dispositivo_id: string, secreto?: string) => {
  const { data: p, error } = await supabase
    .from("pastilleros")
    .select("secreto_hash, codigo, codigo_vence")
    .eq("dispositivo_id", dispositivo_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!p) return null;

  const { count, error: errorVinculos } = await supabase
    .from("pastillero_usuarios")
    .select("usuario_id", { count: "exact", head: true })
    .eq("dispositivo_id", dispositivo_id);
  if (errorVinculos) throw new Error(errorVinculos.message);
  const vinculado = (count ?? 0) > 0;

  if (!secreto) return { vinculado };

  const hash = sha256(secreto);

  if (!p.secreto_hash) {
    const { data: tomado } = await supabase
      .from("pastilleros")
      .update({ secreto_hash: hash })
      .eq("dispositivo_id", dispositivo_id)
      .is("secreto_hash", null)
      .select("dispositivo_id");
    if (!tomado?.length) return { vinculado };
  } else if (!iguales(p.secreto_hash, hash)) {
    return { vinculado };
  }

  if (p.codigo && p.codigo_vence && Date.parse(p.codigo_vence) > Date.now()) {
    return { vinculado, codigo: p.codigo };
  }

  for (let intento = 0; intento < 3; intento++) {
    const codigo = codigoNuevo();
    const { error: e } = await supabase
      .from("pastilleros")
      .update({
        codigo,
        codigo_vence: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
      })
      .eq("dispositivo_id", dispositivo_id);
    if (!e) return { vinculado, codigo };
    if (e.code !== "23505") throw new Error(e.message);
  }
  return { vinculado };
};

export const vincular = async (usuario_id: string, codigo: string) => {
  const { data: pastillero, error } = await supabase
    .from("pastilleros")
    .update({ codigo: null, codigo_vence: null })
    .eq("codigo", codigo)
    .gt("codigo_vence", new Date().toISOString())
    .select("dispositivo_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!pastillero) throw new ErrorHttp(404, "El codigo no existe o ya vencio. Mira el que muestra el pastillero ahora.");

  const { data, error: errorVinculo } = await supabase
    .from("pastillero_usuarios")
    .upsert({ dispositivo_id: pastillero.dispositivo_id, usuario_id }, { onConflict: "dispositivo_id,usuario_id" })
    .select("dispositivo_id, vinculado_at")
    .single();

  if (errorVinculo) throw new Error(errorVinculo.message);
  return data;
};

export const getMisPastilleros = async (usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastillero_usuarios")
    .select("dispositivo_id, nombre, vinculado_at")
    .eq("usuario_id", usuario_id)
    .order("vinculado_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

export const desvincular = async (usuario_id: string, dispositivo_id: string) => {
  const { data, error } = await supabase
    .from("pastillero_usuarios")
    .delete()
    .eq("dispositivo_id", dispositivo_id)
    .eq("usuario_id", usuario_id)
    .select("dispositivo_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "Pastillero no encontrado");

  const { count } = await supabase
    .from("pastillero_usuarios")
    .select("usuario_id", { count: "exact", head: true })
    .eq("dispositivo_id", dispositivo_id);
  if (!count) await supabase.from("pastilleros").update({ secreto_hash: null }).eq("dispositivo_id", dispositivo_id);
};

export const renombrar = async (usuario_id: string, dispositivo_id: string, nombre: string | null) => {
  const { data, error } = await supabase
    .from("pastillero_usuarios")
    .update({ nombre })
    .eq("dispositivo_id", dispositivo_id)
    .eq("usuario_id", usuario_id)
    .select("dispositivo_id, nombre, vinculado_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "Pastillero no encontrado");
  return data;
};

export const esMio = async (usuario_id: string, dispositivo_id: string) => {
  const { data, error } = await supabase
    .from("pastillero_usuarios")
    .select("dispositivo_id")
    .eq("dispositivo_id", dispositivo_id)
    .eq("usuario_id", usuario_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
};
