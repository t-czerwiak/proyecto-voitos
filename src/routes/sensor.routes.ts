import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";

const router = Router();

// GET /api/sensor/pendiente — ESP32 consulta cada 5 min si tiene que dispensar
router.get("/pendiente", sensorController.pendiente);

// POST /api/sensor/confirmacion — ESP32 confirma que dispenso
router.post("/confirmacion", sensorController.confirmacion);

export default router;
