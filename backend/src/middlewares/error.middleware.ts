import { Request, Response, NextFunction } from "express";
import { ErrorHttp } from "../utils/errores";

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Error no manejado:", err.message);

  if (err.type === "entity.parse.failed") {
    res.status(400).json({ success: false, error: "JSON invalido en el body" });
    return;
  }

  if (err instanceof ErrorHttp) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }

  res.status(500).json({ success: false, error: "Error interno del servidor" });
};
