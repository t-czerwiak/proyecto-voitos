import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as horariosController from "../controllers/horarios.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", horariosController.getAll);
router.get("/:id", horariosController.getById);
router.post("/", horariosController.create);
router.put("/:id", horariosController.update);
router.delete("/:id", horariosController.remove);

export default router;
