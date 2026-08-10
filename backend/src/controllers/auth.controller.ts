import { Request, Response, NextFunction } from "express";
import { RegistroSchema, LoginSchema } from "../schemas/auth.schema";
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
