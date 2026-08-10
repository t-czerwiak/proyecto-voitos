import { Request, Response, NextFunction } from "express";
import { PastillaCreateSchema, PastillaUpdateSchema } from "../schemas/pastillas.schema";
import * as pastillasService from "../services/pastillas.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await pastillasService.getAllPastillas(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await pastillasService.getPastillaById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = PastillaCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await pastillasService.createPastilla(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = PastillaUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await pastillasService.updatePastilla(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pastillasService.deletePastilla(req.params.id);
    res.json({ success: true, message: "Pastilla eliminada" });
  } catch (error) {
    next(error);
  }
};

export const getHorarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await pastillasService.getHorariosByPastilla(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
