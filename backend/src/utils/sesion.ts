import { Request } from "express";
import { ErrorHttp } from "./errores";
import { supabase } from "../config/supabase";

export const idDelUsuario = (req: Request): string => {
  const id = (req as any).user?.id;

  if (!id) {
    throw new ErrorHttp(401, "No hay sesion");
  }

  return id;
};

export const esAdmin = async (req: Request): Promise<boolean> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", idDelUsuario(req))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rol === "admin";
};

export const puedeOperar = async (req: Request, esDueno: boolean): Promise<boolean> => {
  if (esDueno) return true;
  return await esAdmin(req);
};

export const exigirAdmin = async (req: Request): Promise<void> => {
  if (!(await esAdmin(req))) {
    throw new ErrorHttp(404, "Ruta no encontrada");
  }
};
