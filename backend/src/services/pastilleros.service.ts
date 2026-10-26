import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabase } from "../config/supabase";
import { ErrorHttp } from "../utils/errores";

const MINUTOS_CODIGO = 30;

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

const iguales = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const codigoNuevo = () => String(randomInt(0, 100_000_000)).padStart(8, "0");

export interface Alcance {
  dueno: string | null;
  ajenos: string[];
}

export const alcanceDe = async (dispositivo_id?: string): Promise<Alcance> => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id, usuario_id")
    .not("usuario_id", "is", null);

  if (error) throw new Error(error.message);

  const dueno = data.find((p) => p.dispositivo_id === dispositivo_id)?.usuario_id ?? null;
  return { dueno, ajenos: dueno ? [] : [...new Set(data.map((p) => p.usuario_id as string))] };
};

export const filtrarPorAlcance = (consulta: any, a: Alcance, columna: string) => {
  if (a.dueno) return consulta.eq(columna, a.dueno);
  if (a.ajenos.length) return consulta.not(columna, "in", `(${a.ajenos.join(",")})`);
  return consulta;
};

export const dispositivosAjenos = async (usuario_id: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id")
    .not("usuario_id", "is", null)
    .neq("usuario_id", usuario_id);

  if (error) throw new Error(error.message);
  return data.map((p) => p.dispositivo_id);
};

export const vinculoParaPlaca = async (dispositivo_id: string, secreto?: string) => {
  const { data: p, error } = await supabase
    .from("pastilleros")
    .select("usuario_id, secreto_hash, codigo, codigo_vence")
    .eq("dispositivo_id", dispositivo_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!p) return null;
  if (p.usuario_id) return { vinculado: true };
  if (!secreto) return { vinculado: false };

  const hash = sha256(secreto);

  if (!p.secreto_hash) {
    const { data: tomado } = await supabase
      .from("pastilleros")
      .update({ secreto_hash: hash })
      .eq("dispositivo_id", dispositivo_id)
      .is("secreto_hash", null)
      .select("dispositivo_id");
    if (!tomado?.length) return { vinculado: false };
  } else if (!iguales(p.secreto_hash, hash)) {
    return { vinculado: false };
  }

  if (p.codigo && p.codigo_vence && Date.parse(p.codigo_vence) > Date.now()) {
    return { vinculado: false, codigo: p.codigo };
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
    if (!e) return { vinculado: false, codigo };
    if (e.code !== "23505") throw new Error(e.message);
  }
  return { vinculado: false };
};

export const vincular = async (usuario_id: string, codigo: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .update({ usuario_id, codigo: null, codigo_vence: null, vinculado_at: new Date().toISOString() })
    .eq("codigo", codigo)
    .is("usuario_id", null)
    .gt("codigo_vence", new Date().toISOString())
    .select("dispositivo_id, vinculado_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "El codigo no existe o ya vencio. Mira el que muestra el pastillero ahora.");
  return data;
};

export const getMisPastilleros = async (usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id, vinculado_at")
    .eq("usuario_id", usuario_id)
    .order("vinculado_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

export const desvincular = async (usuario_id: string, dispositivo_id: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .update({ usuario_id: null, secreto_hash: null, vinculado_at: null })
    .eq("dispositivo_id", dispositivo_id)
    .eq("usuario_id", usuario_id)
    .select("dispositivo_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "Pastillero no encontrado");
};
