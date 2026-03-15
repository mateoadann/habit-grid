import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { initDatabase } from "./db/connection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import habitsRouter from "./routes/habits.js";
import contributionsRouter from "./routes/contributions.js";
import unitsRouter from "./routes/units.js";
import importRouter from "./routes/import.js";
import authRouter from "./routes/auth.js";
import syncRouter from "./routes/sync.js";
import integrationsRouter from "./routes/integrations.js";
import webhooksRouter from "./routes/webhooks.js";
import { syncActivities } from "./services/strava.js";
import { syncContributions } from "./services/github.js";
import { getDb } from "./db/connection.js";

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
app.use("/api/auth", authRouter);
app.use("/api/sync", syncRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/webhooks", webhooksRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`habit-grid API corriendo en http://localhost:${PORT}`);
  console.log(`CORS habilitado para: ${FRONTEND_URL}`);

  // Cron: auto-sync every day at 23:55
  cron.schedule("55 23 * * *", async () => {
    console.log("[CRON] Iniciando sync automático...");
    try {
      const db = getDb();
      const integrations = db.prepare(
        "SELECT id, habit_id, status FROM integrations WHERE status = 'connected'"
      ).all();

      for (const integration of integrations) {
        if (!integration.habit_id) {
          console.log(`[CRON] ${integration.id}: sin hábito vinculado, salteando`);
          continue;
        }

        try {
          if (integration.id === "strava") {
            const result = await syncActivities(integration.habit_id);
            console.log(`[CRON] Strava sync OK:`, result);
          } else if (integration.id === "github") {
            const result = await syncContributions(integration.habit_id);
            console.log(`[CRON] GitHub sync OK:`, result);
          }
        } catch (err) {
          console.error(`[CRON] Error syncing ${integration.id}:`, err.message);
        }
      }

      console.log("[CRON] Sync automático finalizado");
    } catch (err) {
      console.error("[CRON] Error fatal en sync automático:", err.message);
    }
  });

  console.log("[CRON] Sync automático programado para las 23:55");
});
