import { z } from "zod";

// Validador de UUID propio, en vez de z.uuid().
//
// Desde Zod 4, z.uuid() valida los bits de version y variante del RFC 9562, no
// solo el formato. Eso rechaza UUIDs que Postgres acepta sin problema, como el
// nil (todo ceros) o los que se escriben a mano para datos de prueba
// (00000000-0000-0000-0000-000000000002). El resultado era que la API
// rechazaba un identificador que su propia base tenia guardado, con el mensaje
// confuso "debe ser UUID" sobre algo que a la vista es un UUID.
//
// Aca se valida solo la forma: 8-4-4-4-12 en hexadecimal. Es lo mismo que
// acepta el tipo uuid de Postgres, que es quien manda.
const FORMA_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuid = (mensaje: string) => z.string().regex(FORMA_UUID, mensaje);
