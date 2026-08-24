import { Request, Response, NextFunction } from "express";
import * as adminService from "../services/admin.service";
import { avisarVerificacion, ultimoErrorDeMail } from "../services/email.service";
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

// Manda un mail de prueba a la casilla del propio admin y devuelve lo que
// contesto el proveedor.
//
// Existe porque los mails salen sin await: si fallan, el error no vuelve a
// nadie y solo queda en un log del servidor. Sin esto, "no me llego el mail" es
// imposible de diagnosticar desde afuera.
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

// El calendario de todo el mundo junto.
//
// desde y hasta son opcionales, en formato YYYY-MM-DD. La app manda el mes que
// esta mirando; sin rango devuelve todo, que con el tiempo es mucho.
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

// Borra una cuenta entera, con todo lo que cuelga de ella.
export const borrarUsuario = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exigirAdmin(req);

    // Un admin que se borra a si mismo se queda sin panel y sin cuenta, y no
    // hay forma de deshacerlo desde la aplicacion. Se corta antes.
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
