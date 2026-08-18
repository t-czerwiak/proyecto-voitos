import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as authController from "../controllers/auth.controller";

const router = Router();

// Publicas: son las que se usan justamente para conseguir el token.
router.post("/registro", authController.registro);
router.post("/login", authController.login);

// Protegida: devuelve el perfil del dueno del token.
router.get("/yo", authMiddleware, authController.yo);

export default router;
