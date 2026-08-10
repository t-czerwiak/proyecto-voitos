import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as modulosController from "../controllers/modulos.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", modulosController.getAll);
router.get("/:id", modulosController.getById);
// El cuidador registra cuantas pastillas cargo, o cambia la pastilla del modulo
router.put("/:id", modulosController.update);

export default router;
