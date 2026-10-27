import { z } from "zod";

export const RecordatorioSchema = z
  .literal([5, 10, 15, 30, 60], { message: "recordatorio_min tiene que ser 5, 10, 15, 30 o 60" })
  .nullable()
  .optional();
