import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { logger } from "./middlewares/logger.middleware";
import { notFound, errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import usuariosRoutes from "./routes/usuarios.routes";
import pastillasRoutes from "./routes/pastillas.routes";
import horariosRoutes from "./routes/horarios.routes";
import contactosRoutes from "./routes/contactos.routes";
import dispensacionesRoutes from "./routes/dispensaciones.routes";
import alertasRoutes from "./routes/alertas.routes";
import sensorRoutes from "./routes/sensor.routes";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(logger);

// Auth: /registro y /login son publicas (son las que emiten el token),
// /yo esta protegida. Ver src/routes/auth.routes.ts.
app.use("/api/auth", authRoutes);

// Rutas protegidas (requieren JWT de Supabase)
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pastillas", pastillasRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/contactos", contactosRoutes);
app.use("/api/dispensaciones", dispensacionesRoutes);
app.use("/api/alertas", alertasRoutes);

// Rutas publicas (la ESP32 no maneja JWT)
app.use("/api/sensor", sensorRoutes);

// Manejo de errores (siempre al final, despues de las rutas)
app.use(notFound);
app.use(errorHandler);

export default app;
