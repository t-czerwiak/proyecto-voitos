import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as pastillerosController from "../controllers/pastilleros.controller";

const router = Router();

router.use(authMiddleware);

// Los pastilleros vinculados a la cuenta
router.get("/", pastillerosController.getMios);
// Vincular con el codigo de 8 digitos que muestra el display
router.post("/vincular", pastillerosController.vincular);
// Dejarlo sin duenio
router.delete("/:dispositivo_id", pastillerosController.desvincular);

export default router;
