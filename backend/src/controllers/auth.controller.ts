import { Request, Response, NextFunction } from "express";
import {
  RegistroSchema,
  LoginSchema,
  LoginGoogleSchema,
  RecuperarSchema,
  ConfirmarResetSchema,
} from "../schemas/auth.schema";
import * as authService from "../services/auth.service";

export const registro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = RegistroSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await authService.registro(result.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await authService.login(result.data);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const yo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.yo((req as any).user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Vuelve a mandar el mail de verificacion al dueño del token. No recibe ningun
// parametro a proposito: solo se puede pedir para uno mismo.
export const reenviarVerificacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await authService.reenviarVerificacion((req as any).user.id);
    res.json({ success: true, data, message: "Te reenviamos el mail de verificación" });
  } catch (error) {
    next(error);
  }
};

export const google = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = LoginGoogleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await authService.loginConGoogle(result.data);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Pide el mail para cambiar la contrasena. Contesta siempre lo mismo, exista o
// no la cuenta: si la respuesta cambiara, esto seria un buscador de casillas
// registradas.
export const recuperar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = RecuperarSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await authService.pedirRecuperacion(result.data);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const confirmarRecuperacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ConfirmarResetSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await authService.confirmarRecuperacion(result.data);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
