import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as pastillasController from "../controllers/pastillas.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", pastillasController.getAll);
router.get("/:id", pastillasController.getById);
router.get("/:id/horarios", pastillasController.getHorarios);
router.post("/", pastillasController.create);
router.put("/:id", pastillasController.update);
// Recargar o corregir el stock del modulo de esta pastilla
router.patch("/:id/stock", pastillasController.ajustarStock);
router.delete("/:id", pastillasController.remove);

export default router;
