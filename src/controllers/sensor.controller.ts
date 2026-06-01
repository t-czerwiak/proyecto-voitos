import { Request, Response } from "express";
import { LecturaCreateSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = LecturaCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await sensorService.createLectura(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const pastilla_id = req.query.pastilla_id as string | undefined;
    const data = await sensorService.getAllLecturas(pastilla_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
