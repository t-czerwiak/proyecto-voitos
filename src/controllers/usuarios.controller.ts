import { Request, Response } from "express";
import { UsuarioCreateSchema, UsuarioUpdateSchema } from "../schemas/usuarios.schema";
import * as usuariosService from "../services/usuarios.service";

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await usuariosService.getAllUsuarios();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await usuariosService.getUsuarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = UsuarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await usuariosService.createUsuario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = UsuarioUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await usuariosService.updateUsuario(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await usuariosService.deleteUsuario(req.params.id);
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
