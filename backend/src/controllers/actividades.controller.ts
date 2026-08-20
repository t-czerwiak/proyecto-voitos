import { Request, Response, NextFunction } from "express";
import { ActividadCreateSchema, ActividadUpdateSchema } from "../schemas/actividades.schema";
import * as actividadesService from "../services/actividades.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const fecha = req.query.fecha as string | undefined;
    const data = await actividadesService.getAllActividades(usuario_id, fecha);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await actividadesService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }

    const data = await actividadesService.getActividadById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ActividadCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    // El dueño lo pone el servidor, no el cliente. Si viniera del body,
    // cualquiera podria crear registros a nombre de otra persona.
    const data = await actividadesService.createActividad({
      ...result.data,
      usuario_id: idDelUsuario(req),
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ActividadUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await actividadesService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }

    const data = await actividadesService.updateActividad(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await actividadesService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Actividad no encontrada" });
      return;
    }

    await actividadesService.deleteActividad(req.params.id);
    res.json({ success: true, message: "Actividad eliminada" });
  } catch (error) {
    next(error);
  }
};
