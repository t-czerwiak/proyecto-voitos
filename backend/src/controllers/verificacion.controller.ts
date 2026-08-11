import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { ErrorHttp } from "../utils/errores";

const APP_URL = (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");

// Este endpoint lo abre una persona desde el cliente de mail, no la app.
// Por eso devuelve HTML y no JSON: lo que se ve es el resultado final.
const pagina = (titulo: string, mensaje: string, ok: boolean) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Voitos</title>
</head>
<body style="margin:0;min-height:100vh;background-color:#02200F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr>
      <td align="center" valign="middle" style="padding:32px 16px;">
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background-color:#FFFFFF;border-radius:16px;padding:40px 36px;text-align:center;">
          <tr><td>
            <p style="margin:0 0 8px;color:${ok ? "#0B7A38" : "#B26A00"};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Voitos</p>
            <h1 style="margin:0 0 12px;color:#16221C;font-size:24px;line-height:31px;">${titulo}</h1>
            <p style="margin:0 0 28px;color:#3C4A42;font-size:15px;line-height:23px;">${mensaje}</p>
            <a href="${APP_URL}" style="display:inline-block;background-color:#0B7A38;border-radius:8px;padding:14px 30px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">Abrir Voitos</a>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const verificar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre } = await authService.verificarMail(req.params.token);

    res.status(200).send(
      pagina(
        "Listo, tu correo quedó confirmado",
        `Gracias ${nombre}. A partir de ahora vas a recibir los avisos del pastillero en esta casilla.`,
        true
      )
    );
  } catch (error) {
    const esConocido = error instanceof ErrorHttp;
    const status = esConocido ? error.status : 500;
    const mensaje = esConocido
      ? error.message
      : "Hubo un problema al confirmar tu correo. Probá de nuevo en un rato.";

    res.status(status).send(pagina("No pudimos confirmar tu correo", mensaje, false));
  }
};
