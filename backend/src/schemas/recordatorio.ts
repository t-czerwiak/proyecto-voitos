import { z } from "zod";

// Con cuantos minutos de anticipacion aparece el recordatorio en el display
// OLED del pastillero. null (o ausente) = sin recordatorio.
//
// Valores fijos y no un numero libre: son los botones que ofrece la app, y la
// base tiene el mismo check. Una persona mayor toca uno, no escribe minutos.
export const RecordatorioSchema = z
  .literal([5, 10, 15, 30, 60], { message: "recordatorio_min tiene que ser 5, 10, 15, 30 o 60" })
  .nullable()
  .optional();
