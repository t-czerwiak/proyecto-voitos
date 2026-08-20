import { Request, Response, NextFunction } from "express";
import * as alertasService from "../services/alertas.service";
import { idDelUsuario } from "../utils/sesion";

export const getDosisNoTomadas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const data = await alertasService.getDosisNoTomadas(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
