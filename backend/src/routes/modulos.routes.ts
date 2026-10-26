import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as modulosController from "../controllers/modulos.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", modulosController.getAll);
router.get("/:id", modulosController.getById);

router.put("/:id", modulosController.update);

export default router;
