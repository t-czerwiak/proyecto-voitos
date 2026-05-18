// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Token requerido" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: "Token invalido o expirado" });
    return;
  }

  (req as any).user = data.user;
  next();
};
