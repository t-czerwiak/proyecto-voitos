import { Request, Response, NextFunction } from "express";
import { ContactoCreateSchema, ContactoUpdateSchema } from "../schemas/contactos.schema";
import * as contactosService from "../services/contactos.service";
import { idDelUsuario, puedeOperar } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario_id = idDelUsuario(req);
    const data = await contactosService.getAllContactos(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await puedeOperar(req, await contactosService.esDelUsuario(req.params.id, idDelUsuario(req))))) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }

    const data = await contactosService.getContactoById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ContactoCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await contactosService.createContacto({
      ...result.data,
      usuario_id: idDelUsuario(req),
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const result = ContactoUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    if (!(await puedeOperar(req, await contactosService.esDelUsuario(req.params.id, idDelUsuario(req))))) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }

    const data = await contactosService.updateContacto(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await puedeOperar(req, await contactosService.esDelUsuario(req.params.id, idDelUsuario(req))))) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }

    await contactosService.deleteContacto(req.params.id);
    res.json({ success: true, message: "Contacto eliminado" });
  } catch (error) {
    next(error);
  }
};
