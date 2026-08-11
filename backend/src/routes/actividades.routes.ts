import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as actividadesController from "../controllers/actividades.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", actividadesController.getAll);
router.get("/:id", actividadesController.getById);
router.post("/", actividadesController.create);
router.put("/:id", actividadesController.update);
router.delete("/:id", actividadesController.remove);

export default router;
