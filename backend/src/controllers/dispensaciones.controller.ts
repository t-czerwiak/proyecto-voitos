import { Request, Response, NextFunction } from "express";
import * as dispensacionesService from "../services/dispensaciones.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const data = await dispensacionesService.getAllDispensaciones(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
