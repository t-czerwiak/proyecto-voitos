import { z } from "zod";

const FORMA_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuid = (mensaje: string) => z.string().regex(FORMA_UUID, mensaje);
