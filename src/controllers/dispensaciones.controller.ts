import { Request, Response, NextFunction } from "express";
import * as dispensacionesService from "../services/dispensaciones.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await dispensacionesService.getAllDispensaciones(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
