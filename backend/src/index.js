import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDatabase } from "./db/connection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import habitsRouter from "./routes/habits.js";
import contributionsRouter from "./routes/contributions.js";
import unitsRouter from "./routes/units.js";
import importRouter from "./routes/import.js";

// Initialize database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Middleware
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/habits", habitsRouter);
app.use("/api/habits", contributionsRouter);
app.use("/api/units", unitsRouter);
app.use("/api/import", importRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`habit-grid API corriendo en http://localhost:${PORT}`);
  console.log(`CORS habilitado para: ${FRONTEND_URL}`);
});
