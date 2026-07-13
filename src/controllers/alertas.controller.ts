import { Request, Response } from "express";
import * as alertasService from "../services/alertas.service";

export const getDosisNoTomadas = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await alertasService.getDosisNoTomadas(usuario_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
