import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as alertasController from "../controllers/alertas.controller";

const router = Router();

router.use(authMiddleware);

// GET /api/alertas?usuario_id=uuid — dosis vencidas sin dispensar, con el
// usuario y sus contactos de emergencia a quienes avisar
router.get("/", alertasController.getDosisNoTomadas);

export default router;
