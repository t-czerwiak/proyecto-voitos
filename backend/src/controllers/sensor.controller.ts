import { Request, Response, NextFunction } from "express";
import { ConfirmacionSchema, DispensarSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";
import { getRecordatorios } from "../services/recordatorios.service";
import { alcanceDe, esLaPlaca, vinculoParaPlaca } from "../services/pastilleros.service";
import { getActualizacion } from "../services/firmware.service";

export const pendiente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = req.query.dispositivo_id;
    const dispositivo_id = typeof q === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(q) ? q : undefined;
    const alcance = await alcanceDe(dispositivo_id);
    const secreto = req.get("x-pastillero-secreto");
    const v = Number(req.query.version);
    const version = Number.isInteger(v) && v > 0 ? v : null;

    // Agenda y firmware solo para la placa con su secreto: el .bin lleva la
    // clave del OTA local.
    const autenticada = dispositivo_id ? await esLaPlaca(dispositivo_id, secreto).catch(() => false) : false;

    const [pendiente, recordatorios, vinculo, agenda, firmware] = await Promise.all([
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
      autenticada
        ? sensorService.getAgenda(alcance).catch((e) => {
            console.error(`No se pudo armar la agenda: ${e.message}`);
            return [];
          })
        : [],
      autenticada && version !== null
        ? getActualizacion(version).catch((e) => {
            console.error(`No se pudo revisar el firmware: ${e.message}`);
            return null;
          })
        : null,
    ]);
    res.json({
      success: true,
      data: { ...pendiente, recordatorios, agenda, ...(vinculo && { vinculo }), ...(firmware && { firmware }) },
    });
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
