import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Voitos API funcionando" });
});

// Rutas (se irán agregando por sprint)
// app.use("/api/sensor", sensorRoutes);
// app.use("/api/medicamentos", medicamentosRoutes);
// app.use("/api/actividades", actividadesRoutes);
// app.use("/api/alertas", alertasRoutes);

export default app;
