import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as authController from "../controllers/auth.controller";
import * as verificacionController from "../controllers/verificacion.controller";

const router = Router();

// Publicas: son las que se usan justamente para conseguir el token.
router.post("/registro", authController.registro);
router.post("/login", authController.login);

// Login/registro con Google en un solo paso: si la cuenta no existe se crea.
router.post("/google", authController.google);

// Recuperacion de contrasena. Las dos son publicas por definicion: se usan
// justamente cuando no se puede iniciar sesion.
router.post("/recuperar", authController.recuperar);
router.post("/recuperar/confirmar", authController.confirmarRecuperacion);

// Publica y devuelve HTML, no JSON: la abre una persona desde el mail.
router.get("/verificar/:token", verificacionController.verificar);

// Protegida: devuelve el perfil del dueno del token.
router.get("/yo", authMiddleware, authController.yo);

// Reenvia el mail de verificacion. Protegida: solo para la propia cuenta.
router.post("/reenviar-verificacion", authMiddleware, authController.reenviarVerificacion);

export default router;
