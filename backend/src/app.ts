import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { logger } from "./middlewares/logger.middleware";
import { notFound, errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import usuariosRoutes from "./routes/usuarios.routes";
import pastillasRoutes from "./routes/pastillas.routes";
import horariosRoutes from "./routes/horarios.routes";
import contactosRoutes from "./routes/contactos.routes";
import dispensacionesRoutes from "./routes/dispensaciones.routes";
import modulosRoutes from "./routes/modulos.routes";
import pastillerosRoutes from "./routes/pastilleros.routes";
import actividadesRoutes from "./routes/actividades.routes";
import alertasRoutes from "./routes/alertas.routes";
import sensorRoutes from "./routes/sensor.routes";
import adminRoutes from "./routes/admin.routes";

dotenv.config();

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors());

app.use(express.json({ limit: "16kb" }));

app.use(logger);

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos. Espera 15 minutos y volve a probar.",
  },
});

app.use("/api/auth/login", limiteAuth);
app.use("/api/auth/registro", limiteAuth);

const limiteRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos. Espera 15 minutos y volve a probar.",
  },
});

app.use("/api/auth/recuperar", limiteRecuperacion);
app.use("/api/auth/google", limiteRecuperacion);

app.use("/api/auth", authRoutes);

app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pastillas", pastillasRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/contactos", contactosRoutes);
app.use("/api/dispensaciones", dispensacionesRoutes);
app.use("/api/modulos", modulosRoutes);
app.use("/api/pastilleros", pastillerosRoutes);
app.use("/api/actividades", actividadesRoutes);
app.use("/api/alertas", alertasRoutes);

app.use("/api/admin", adminRoutes);

app.get("/api/logo.png", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "assets", "voitos-logo.png"), {
    maxAge: "1d",
  });
});

app.use("/api/sensor", sensorRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
