import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as pastillasController from "../controllers/pastillas.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", pastillasController.getAll);
router.get("/:id", pastillasController.getById);
router.post("/", pastillasController.create);
router.put("/:id", pastillasController.update);
router.delete("/:id", pastillasController.remove);

export default router;
