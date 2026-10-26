import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";

const router = Router();

router.get("/pendiente", sensorController.pendiente);

router.post("/dispensar", sensorController.dispensar);

router.post("/confirmacion", sensorController.confirmacion);

export default router;
