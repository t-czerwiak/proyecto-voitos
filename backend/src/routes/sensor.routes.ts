import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";

const router = Router();

// GET /api/sensor/pendiente — ESP32 consulta cada 5 min si tiene que dispensar
router.get("/pendiente", sensorController.pendiente);

// POST /api/sensor/dispensar — el backend le manda la orden al dispositivo
// por WiFi (sentido inverso: aca el backend inicia la conexion)
router.post("/dispensar", sensorController.dispensar);

// POST /api/sensor/confirmacion — ESP32 confirma que dispenso
router.post("/confirmacion", sensorController.confirmacion);

export default router;
