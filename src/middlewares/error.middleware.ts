import { Request, Response, NextFunction } from "express";

// Se ejecuta cuando ninguna ruta coincide con la URL pedida.
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

// Red de seguridad para cualquier error que no se haya atrapado antes
// (ej: JSON mal formado en el body). Express lo llama automaticamente cuando
// se le pasa un error. Evita que el servidor devuelva un HTML de error feo
// y mantiene el formato { success, error } consistente con el resto de la API.
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Error no manejado:", err.message);

  // Body con JSON invalido
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ success: false, error: "JSON invalido en el body" });
    return;
  }

  res.status(500).json({ success: false, error: "Error interno del servidor" });
};
