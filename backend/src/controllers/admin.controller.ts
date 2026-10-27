import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { avisarVerificacion, ultimoErrorDeMail } from "../services/email.service";
import { esAdmin, exigirAdmin, idDelUsuario } from "../utils/sesion";

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

    const data = await adminService.vaciarCalendarioDe(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const soyAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: { admin: await esAdmin(req), id: idDelUsuario(req) } });
  } catch (error) {
    next(error);
  }
};

export const probarMail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    const destino = await adminService.mailDe(idDelUsuario(req));
    if (!destino) {
      res.status(404).json({ success: false, error: "No se encontro tu casilla" });
      return;
    }

    const salio = await avisarVerificacion({
      cuidadorMail: destino,
      cuidadorNombre: "Prueba",
      enlace: "https://voitos.vercel.app",
      horasParaVencer: 24,
    });

    res.json({
      success: true,
      data: {
        enviado: salio,
        destino,
        error: salio ? null : ultimoErrorDeMail(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const calendarioCompleto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    const fecha = /^\d{4}-\d{2}-\d{2}$/;
    const desde = typeof req.query.desde === "string" && fecha.test(req.query.desde) ? req.query.desde : undefined;
    const hasta = typeof req.query.hasta === "string" && fecha.test(req.query.hasta) ? req.query.hasta : undefined;

    const data = await adminService.getCalendarioCompleto(desde, hasta);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const borrarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    if (req.params.id === idDelUsuario(req)) {
      res.status(409).json({
        success: false,
        error: "No podes borrar tu propia cuenta desde el panel",
      });
      return;
    }

    const data = await adminService.borrarUsuario(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
