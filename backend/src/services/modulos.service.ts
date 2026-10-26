import { supabase } from "../config/supabase";
import { ModuloUpdate } from "../schemas/modulos.schema";
import { ErrorHttp } from "../utils/errores";
import { dispositivosAjenos } from "./pastilleros.service";

const CAMPOS = "id, numero, nombre, pastilla_id, cantidad_actual, dispositivo_id";

const sinAjenos = (consulta: any, ajenos: string[]) =>
  ajenos.length
    ? consulta.not("dispositivo_id", "in", `(${ajenos.map((d) => `"${d}"`).join(",")})`)
    : consulta;

export const getAllModulos = async (usuario_id: string, dispositivo_id?: string) => {
  let query = sinAjenos(
    supabase
      .from("modulos")
      .select("*, pastillas(id, nombre, tipo)")
      .order("numero", { ascending: true }),
    await dispositivosAjenos(usuario_id)
  );

  if (dispositivo_id) query = query.eq("dispositivo_id", dispositivo_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getModuloById = async (id: string, usuario_id: string) => {
  const { data, error } = await sinAjenos(
    supabase.from("modulos").select("*, pastillas(id, nombre, tipo)").eq("id", id),
    await dispositivosAjenos(usuario_id)
  ).maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

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

export const asignarPastillaAModulo = async (
  pastilla_id: string,
  cantidad: number,
  usuario_id: string,
  numeroPedido?: number
) => {
  const ajenos = await dispositivosAjenos(usuario_id);

  if (numeroPedido !== undefined) {
    const { data: existente } = await sinAjenos(
      supabase.from("modulos").select("id").eq("numero", numeroPedido),
      ajenos
    )
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

  const { data: libre } = await sinAjenos(
    supabase.from("modulos").select("id").is("pastilla_id", null),
    ajenos
  )
    .order("numero", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!libre) return null;

  return await updateModulo(libre.id, {
    pastilla_id,
    cantidad_actual: cantidad,
  });
};

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
