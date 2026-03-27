import "dotenv/config";
import cron from "node-cron";
import { createApp } from "./app.js";
import { syncActivities } from "./services/strava.js";
import { syncContributions } from "./services/github.js";
import { getDb } from "./db/connection.js";

const app = createApp();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function runAutoSync() {
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
}

app.listen(PORT, () => {
  console.log(`habit-grid API corriendo en http://localhost:${PORT}`);
  console.log(`CORS habilitado para: ${FRONTEND_URL}`);

  // Cron: auto-sync at 12:00 and 23:55
  cron.schedule("0 12 * * *", runAutoSync);
  cron.schedule("55 23 * * *", runAutoSync);

  console.log("[CRON] Sync automático programado para las 12:00 y 23:55");
});
