import { Request, Response, NextFunction } from "express";
import { ConfirmacionSchema, DispensarSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";
import { getRecordatorios } from "../services/recordatorios.service";

export const pendiente = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Los recordatorios del display viajan en la misma consulta que la placa
    // ya hace cada 30 s, asi el firmware no suma un pedido HTTP mas.
    //
    // Si los recordatorios fallan, la dosis igual tiene que llegar: el display
    // es un extra, la alarma no. Por eso el error se loguea y se manda [].
    const [pendiente, recordatorios] = await Promise.all([
      sensorService.getPendiente(),
      getRecordatorios().catch((e) => {
        console.error(`No se pudieron calcular los recordatorios: ${e.message}`);
        return [];
      }),
    ]);
    res.json({ success: true, data: { ...pendiente, recordatorios } });
  } catch (error) {
    next(error);
  }
};

export const dispensar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // El body entero es opcional: sin body se usa el destino del .env
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
