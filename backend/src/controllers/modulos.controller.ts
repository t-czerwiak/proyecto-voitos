import { Request, Response, NextFunction } from "express";
import { ModuloUpdateSchema } from "../schemas/modulos.schema";
import * as modulosService from "../services/modulos.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dispositivo_id = req.query.dispositivo_id as string | undefined;
    const data = await modulosService.getAllModulos(idDelUsuario(req), dispositivo_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await modulosService.getModuloById(req.params.id, idDelUsuario(req));
    if (!data) {
      res.status(404).json({ success: false, error: "Modulo no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ModuloUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    // El modulo de un pastillero ajeno no se toca: 404 como si no existiera.
    if (!(await modulosService.getModuloById(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Modulo no encontrado" });
      return;
    }
    const data = await modulosService.updateModulo(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Modulo no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
