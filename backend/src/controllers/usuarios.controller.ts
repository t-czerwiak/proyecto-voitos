import { Request, Response, NextFunction } from "express";
import { FotoSchema, UsuarioCreateSchema, UsuarioUpdateSchema } from "../schemas/usuarios.schema";
import * as usuariosService from "../services/usuarios.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await usuariosService.getUsuarioById(idDelUsuario(req));
    res.json({ success: true, data: data ? [data] : [] });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id !== idDelUsuario(req)) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    const data = await usuariosService.getUsuarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = UsuarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await usuariosService.createUsuario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = UsuarioUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    if (req.params.id !== idDelUsuario(req)) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    const data = await usuariosService.updateUsuario(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id !== idDelUsuario(req)) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    await usuariosService.deleteUsuario(req.params.id);
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    next(error);
  }
};

export const subirFoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = FotoSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await usuariosService.guardarFoto(idDelUsuario(req), result.data.imagen);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const quitarFoto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await usuariosService.quitarFoto(idDelUsuario(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
