import { Request, Response, NextFunction } from "express";
import {
  PastillaCreateSchema,
  PastillaUpdateSchema,
  StockAjusteSchema,
} from "../schemas/pastillas.schema";
import * as pastillasService from "../services/pastillas.service";
import { ajustarStockDePastilla } from "../services/modulos.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const data = await pastillasService.getAllPastillas(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await pastillasService.getPastillaById(req.params.id, idDelUsuario(req));
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
    // El dueño lo pone el servidor, no el cliente. Si viniera del body,
    // cualquiera podria crear registros a nombre de otra persona.
    const data = await pastillasService.createPastilla({
      ...result.data,
      usuario_id: idDelUsuario(req),
    });
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
    // Sin esto, cualquiera con sesion podria operar sobre una pastilla ajena
    // solo poniendo su id en la URL. Se responde 404 y no 403 para no revelar
    // que ese id existe.
    if (!(await pastillasService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }

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
    // Sin esto, cualquiera con sesion podria operar sobre una pastilla ajena
    // solo poniendo su id en la URL. Se responde 404 y no 403 para no revelar
    // que ese id existe.
    if (!(await pastillasService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }

    await pastillasService.deletePastilla(req.params.id);
    res.json({ success: true, message: "Pastilla eliminada" });
  } catch (error) {
    next(error);
  }
};

export const getHorarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Sin esto, cualquiera con sesion podria operar sobre una pastilla ajena
    // solo poniendo su id en la URL. Se responde 404 y no 403 para no revelar
    // que ese id existe.
    if (!(await pastillasService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }

    const data = await pastillasService.getHorariosByPastilla(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Suma o resta pastillas del modulo donde esta cargada esta. Se hace por
// pastilla y no por modulo porque el cuidador piensa en "me quedan pocas
// aspirinas", no en "el modulo 2 esta bajo".
export const ajustarStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = StockAjusteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    // Sin esto, cualquiera con sesion podria operar sobre una pastilla ajena
    // solo poniendo su id en la URL. Se responde 404 y no 403 para no revelar
    // que ese id existe.
    if (!(await pastillasService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }

    const data = await ajustarStockDePastilla(req.params.id, result.data.delta);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Borra las dosis pendientes de una rutina, dejando la pastilla y el historial
// en pie. Los filtros llegan por query string porque son opcionales: sin
// ninguno, borra todas las pendientes de la pastilla.
export const cancelarRutina = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const aNumero = (v: unknown) => (v === undefined ? undefined : Number(v));

  try {
    // Sin esto, cualquiera con sesion podria operar sobre una pastilla ajena
    // solo poniendo su id en la URL. Se responde 404 y no 403 para no revelar
    // que ese id existe.
    if (!(await pastillasService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }

    const data = await pastillasService.cancelarRutina(req.params.id, {
      hora: aNumero(req.query.hora),
      minuto: aNumero(req.query.minuto),
      desde: req.query.desde as string | undefined,
      hasta: req.query.hasta as string | undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
