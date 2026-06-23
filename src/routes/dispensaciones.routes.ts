import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as dispensacionesController from "../controllers/dispensaciones.controller";

const router = Router();

router.use(authMiddleware);

// GET /api/dispensaciones?usuario_id=uuid — historial con info de pastilla
router.get("/", dispensacionesController.getAll);

export default router;
