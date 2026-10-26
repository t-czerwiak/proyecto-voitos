import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.use(authMiddleware);

router.get("/soy-admin", adminController.soyAdmin);

router.post("/probar-mail", adminController.probarMail);

router.get("/calendario", adminController.calendarioCompleto);

router.get("/usuarios", adminController.getUsuarios);
router.get("/usuarios/:id/pastillas", adminController.pastillasDe);
router.get("/usuarios/:id/horarios", adminController.horariosDe);

router.post("/usuarios/:id/verificar", adminController.verificar);
router.post("/usuarios/:id/desverificar", adminController.desverificar);

router.delete("/usuarios/:id", adminController.borrarUsuario);

router.delete("/usuarios/:id/calendario", adminController.vaciarCalendario);

export default router;
