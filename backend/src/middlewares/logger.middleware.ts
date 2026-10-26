import { Request, Response, NextFunction } from "express";

export const logger = (req: Request, res: Response, next: NextFunction): void => {
  const inicio = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - inicio;
    const hora = new Date().toISOString();
    console.log(`[${hora}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next();
};
