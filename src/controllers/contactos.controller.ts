import { Request, Response } from "express";
import { ContactoCreateSchema, ContactoUpdateSchema } from "../schemas/contactos.schema";
import * as contactosService from "../services/contactos.service";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await contactosService.getAllContactos(usuario_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await contactosService.getContactoById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = ContactoCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await contactosService.createContacto(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = ContactoUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await contactosService.updateContacto(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await contactosService.deleteContacto(req.params.id);
    res.json({ success: true, message: "Contacto eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
