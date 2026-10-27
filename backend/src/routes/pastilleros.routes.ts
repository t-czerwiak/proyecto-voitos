import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as pastillerosController from "../controllers/pastilleros.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", pastillerosController.getMios);

router.post("/vincular", pastillerosController.vincular);

router.patch("/:dispositivo_id", pastillerosController.renombrar);

router.delete("/:dispositivo_id", pastillerosController.desvincular);

export default router;
