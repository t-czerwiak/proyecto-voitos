import { Request, Response, NextFunction } from "express";
import { ConfirmacionSchema, DispensarSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";
import { getRecordatorios } from "../services/recordatorios.service";
import { alcanceDe, vinculoParaPlaca } from "../services/pastilleros.service";

export const pendiente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query.dispositivo_id;
    const dispositivo_id = typeof q === "string" && q.length <= 64 ? q : undefined;
    const alcance = await alcanceDe(dispositivo_id);

    const [pendiente, recordatorios, vinculo] = await Promise.all([
      sensorService.getPendiente(alcance),
      getRecordatorios(alcance).catch((e) => {
        console.error(`No se pudieron calcular los recordatorios: ${e.message}`);
        return [];
      }),
      dispositivo_id
        ? vinculoParaPlaca(dispositivo_id, req.get("x-pastillero-secreto")).catch((e) => {
            console.error(`No se pudo leer el vinculo: ${e.message}`);
            return null;
          })
        : null,
    ]);
    res.json({ success: true, data: { ...pendiente, recordatorios, ...(vinculo && { vinculo }) } });
  } catch (error) {
    next(error);
  }
};

export const dispensar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = DispensarSchema.safeParse(req.body ?? {});
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await sensorService.enviarSenalDispensar(result.data);
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
