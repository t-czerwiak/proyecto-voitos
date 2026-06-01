import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as contactosController from "../controllers/contactos.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", contactosController.getAll);
router.get("/:id", contactosController.getById);
router.post("/", contactosController.create);
router.put("/:id", contactosController.update);
router.delete("/:id", contactosController.remove);

export default router;
