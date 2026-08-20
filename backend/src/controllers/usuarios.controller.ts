import { Request, Response, NextFunction } from "express";
import { UsuarioCreateSchema, UsuarioUpdateSchema } from "../schemas/usuarios.schema";
import * as usuariosService from "../services/usuarios.service";
import { idDelUsuario } from "../utils/sesion";

// Devuelve solo al usuario del token, no la lista completa.
//
// Antes cualquiera con sesion podia leer el nombre, apellido, mail y edad de
// todos los usuarios del sistema. La app nunca uso este endpoint, asi que
// acotarlo no rompe nada.
//
// Se mantiene como lista (un arreglo de un elemento) para no cambiar la forma
// de la respuesta.
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
    // Solo el propio perfil. Con otro id se responde 404 y no 403, para no
    // confirmar que ese usuario existe.
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
