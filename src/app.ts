import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabase } from "./config/supabase";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Voitos API funcionando" });
});

// Test de conexión a Supabase
app.get("/test-db", async (_req, res) => {
  const { data, error } = await supabase.from("usuarios").select("*");
  if (error) return res.json({ success: false, error: error.message });
  res.json({ success: true, data });
});

// Rutas (se irán agregando por sprint)
// app.use("/api/sensor", sensorRoutes);
// app.use("/api/medicamentos", medicamentosRoutes);
// app.use("/api/actividades", actividadesRoutes);
// app.use("/api/alertas", alertasRoutes);

export default app;
