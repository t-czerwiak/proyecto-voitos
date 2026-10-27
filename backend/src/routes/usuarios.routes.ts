import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as usuariosController from "../controllers/usuarios.controller";

const router = Router();

router.use(authMiddleware);

router.post("/yo/foto", usuariosController.subirFoto);
router.delete("/yo/foto", usuariosController.quitarFoto);

router.get("/", usuariosController.getAll);
router.get("/:id", usuariosController.getById);
router.post("/", usuariosController.create);
router.put("/:id", usuariosController.update);
router.delete("/:id", usuariosController.remove);

export default router;
