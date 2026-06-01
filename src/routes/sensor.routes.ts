import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";

const router = Router();

router.post("/", sensorController.create);
router.get("/", sensorController.getAll);

export default router;
