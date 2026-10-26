import { Request, Response, NextFunction } from "express";
import * as dispensacionesService from "../services/dispensaciones.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario_id = idDelUsuario(req);
    const data = await dispensacionesService.getAllDispensaciones(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
