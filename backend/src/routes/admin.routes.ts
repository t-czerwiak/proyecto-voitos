import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as adminController from "../controllers/admin.controller";

const router = Router();

// Hace falta sesion para todo. Ademas, cada handler verifica el rol admin por
// su cuenta y responde 404 si no lo tiene, asi un usuario normal no puede ni
// enterarse de que estas rutas existen.
router.use(authMiddleware);

// Lo unico que responde a cualquiera con sesion: si es admin o no. La app lo
// usa para decidir si muestra el acceso al panel.
router.get("/soy-admin", adminController.soyAdmin);

// Diagnostico: manda un mail de prueba y devuelve la respuesta del proveedor
router.post("/probar-mail", adminController.probarMail);

router.get("/usuarios", adminController.getUsuarios);
router.get("/usuarios/:id/pastillas", adminController.pastillasDe);
router.get("/usuarios/:id/horarios", adminController.horariosDe);

// Verificar una cuenta a mano, cuando el mail no llego o el enlace vencio
router.post("/usuarios/:id/verificar", adminController.verificar);
router.post("/usuarios/:id/desverificar", adminController.desverificar);

// Borra una cuenta entera. Por FK en cascada se lleva pastillas, horarios,
// dispensaciones, contactos y actividades. Los modulos quedan, vacios.
router.delete("/usuarios/:id", adminController.borrarUsuario);

// Borra las dosis pendientes de un usuario. Las ya dispensadas quedan: son el
// historial de lo que salio del pastillero.
router.delete("/usuarios/:id/calendario", adminController.vaciarCalendario);

export default router;
