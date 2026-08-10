import { Request, Response, NextFunction } from "express";

// Loguea cada request con su metodo, ruta, codigo de respuesta y cuanto tardo.
// Sirve para ver la actividad del backend en desarrollo y para detectar
// endpoints lentos o que fallan seguido.
export const logger = (req: Request, res: Response, next: NextFunction): void => {
  const inicio = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - inicio;
    const hora = new Date().toISOString();
    console.log(`[${hora}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next();
};
