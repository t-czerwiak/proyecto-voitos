import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as alertasController from "../controllers/alertas.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", alertasController.getDosisNoTomadas);

export default router;
