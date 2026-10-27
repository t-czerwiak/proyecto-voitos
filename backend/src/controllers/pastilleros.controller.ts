import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as pastillerosService from "../services/pastilleros.service";
import { idDelUsuario } from "../utils/sesion";

const VincularSchema = z.object({
  codigo: z
    .string()
    .transform((c) => c.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^[0-9]{8}$/, "El codigo son 8 numeros")),
});

const RenombrarSchema = z.object({
  nombre: z
    .string()
    .trim()
    .max(40, "El nombre puede tener hasta 40 letras")
    .transform((n) => n || null)
    .nullable(),
});

export const getMios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await pastillerosService.getMisPastilleros(idDelUsuario(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const vincular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = VincularSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await pastillerosService.vincular(idDelUsuario(req), result.data.codigo);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const desvincular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pastillerosService.desvincular(idDelUsuario(req), req.params.dispositivo_id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

export const renombrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = RenombrarSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await pastillerosService.renombrar(idDelUsuario(req), req.params.dispositivo_id, result.data.nombre);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
