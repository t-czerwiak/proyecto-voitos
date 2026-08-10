import { Request, Response, NextFunction } from "express";
import { ActividadCreateSchema, ActividadUpdateSchema } from "../schemas/actividades.schema";
import * as actividadesService from "../services/actividades.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const fecha = req.query.fecha as string | undefined;
    const data = await actividadesService.getAllActividades(usuario_id, fecha);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await actividadesService.getActividadById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ActividadCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await actividadesService.createActividad(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ActividadUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await actividadesService.updateActividad(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await actividadesService.deleteActividad(req.params.id);
    res.json({ success: true, message: "Actividad eliminada" });
  } catch (error) {
    next(error);
  }
};
