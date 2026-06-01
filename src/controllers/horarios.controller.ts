import { Request, Response } from "express";
import { HorarioCreateSchema, HorarioUpdateSchema } from "../schemas/horarios.schema";
import * as horariosService from "../services/horarios.service";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const pastilla_id = req.query.pastilla_id as string | undefined;
    const data = await horariosService.getAllHorarios(pastilla_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await horariosService.getHorarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Horario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = HorarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await horariosService.createHorario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await horariosService.deleteHorario(req.params.id);
    res.json({ success: true, message: "Horario eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
