import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as authController from "../controllers/auth.controller";
import * as verificacionController from "../controllers/verificacion.controller";

const router = Router();

router.post("/registro", authController.registro);
router.post("/login", authController.login);

router.post("/google", authController.google);

router.post("/recuperar", authController.recuperar);
router.post("/recuperar/confirmar", authController.confirmarRecuperacion);

router.get("/verificar/:token", verificacionController.verificar);

router.get("/yo", authMiddleware, authController.yo);

router.post("/reenviar-verificacion", authMiddleware, authController.reenviarVerificacion);

router.post("/cambiar-password", authMiddleware, authController.cambiarPassword);

export default router;
