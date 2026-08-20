import { Request, Response, NextFunction } from "express";
import { ContactoCreateSchema, ContactoUpdateSchema } from "../schemas/contactos.schema";
import * as contactosService from "../services/contactos.service";
import { idDelUsuario } from "../utils/sesion";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Del token, no de la query: el cliente no elige de quien son los datos.
    const usuario_id = idDelUsuario(req);
    const data = await contactosService.getAllContactos(usuario_id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await contactosService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
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
    // El dueño lo pone el servidor, no el cliente. Si viniera del body,
    // cualquiera podria crear registros a nombre de otra persona.
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
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await contactosService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
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
    // Se responde 404 y no 403 para no revelar que ese id existe.
    if (!(await contactosService.esDelUsuario(req.params.id, idDelUsuario(req)))) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }

    await contactosService.deleteContacto(req.params.id);
    res.json({ success: true, message: "Contacto eliminado" });
  } catch (error) {
    next(error);
  }
};
