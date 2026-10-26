import { Request, Response, NextFunction } from "express";
import { ConfirmacionSchema, DispensarSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";
import { getRecordatorios } from "../services/recordatorios.service";
import { alcanceDe, vinculoParaPlaca } from "../services/pastilleros.service";

export const pendiente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // La placa dice quien es para recibir solo lo de su duenio (si tiene) y su
    // codigo de vinculacion (si no). Una placa vieja que no lo manda sigue
    // andando como antes. El secreto va en un header y no en la URL para que
    // no quede en los logs de Render.
    const q = req.query.dispositivo_id;
    const dispositivo_id = typeof q === "string" && q.length <= 64 ? q : undefined;
    const alcance = await alcanceDe(dispositivo_id);

    // Los recordatorios del display viajan en la misma consulta que la placa
    // ya hace cada 30 s, asi el firmware no suma un pedido HTTP mas.
    //
    // Si los recordatorios fallan, la dosis igual tiene que llegar: el display
    // es un extra, la alarma no. Por eso el error se loguea y se manda [].
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
