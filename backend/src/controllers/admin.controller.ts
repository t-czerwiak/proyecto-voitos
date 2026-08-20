import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { esAdmin, exigirAdmin, idDelUsuario } from "../utils/sesion";

// Todas las rutas de este controlador exigen rol admin. La verificacion se hace
// adentro de cada handler y no en un middleware suelto para que quede a la
// vista: es facil montar una ruta nueva y olvidarse del middleware, no lo es
// tanto olvidarse de la primera linea del handler que se esta copiando.

export const getUsuarios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);
    const data = await adminService.getUsuarios();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const verificar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);
    const data = await adminService.verificarUsuario(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const desverificar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    // Un admin que se desverifica a si mismo pierde el cartel de cuenta
    // verificada pero no el rol. Se permite: es util para probar el aviso.
    const data = await adminService.desverificarUsuario(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const pastillasDe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);
    const data = await adminService.getPastillasDe(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const horariosDe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);
    const data = await adminService.getHorariosDe(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const vaciarCalendario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    // Se deja borrar el calendario de cualquiera, incluido el propio: no hay
    // razon para prohibirlo y una excepcion ahi solo confunde.
    const data = await adminService.vaciarCalendarioDe(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Si el que pide es admin. La app lo usa para decidir si muestra el acceso al
// panel; la seguridad no depende de esta respuesta, cada ruta lo verifica sola.
export const soyAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: { admin: await esAdmin(req), id: idDelUsuario(req) } });
  } catch (error) {
    next(error);
  }
};
