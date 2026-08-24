import { Request, Response, NextFunction } from "express";
import { HorarioCreateSchema, HorarioUpdateSchema } from "../schemas/horarios.schema";
import * as horariosService from "../services/horarios.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pastilla_id = req.query.pastilla_id as string | undefined;
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const data = await horariosService.getAllHorarios({ pastilla_id, usuario_id });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await horariosService.getHorarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Horario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = HorarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await horariosService.createHorario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = HorarioUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await horariosService.updateHorario(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Horario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await horariosService.deleteHorario(req.params.id);
    res.json({ success: true, message: "Horario eliminado" });
  } catch (error) {
    next(error);
  }
};

export const getByDia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await horariosService.getHorariosByDia(req.params.fecha);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
