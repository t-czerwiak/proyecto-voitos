import { Request, Response, NextFunction } from "express";
import { ConfirmacionSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";

export const pendiente = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await sensorService.getPendiente();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const confirmacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ConfirmacionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await sensorService.createConfirmacion(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
