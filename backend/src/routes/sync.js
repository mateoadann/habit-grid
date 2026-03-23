import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";
import { syncActivities } from "../services/strava.js";
import { syncContributions } from "../services/github.js";

const router = Router();

// POST /api/sync/strava — manually trigger Strava sync
router.post("/strava", async (req, res, next) => {
  try {
    const db = getDb();

    // Get strava integration and verify it's connected
    const integration = db.prepare("SELECT * FROM integrations WHERE id = 'strava'").get();
    if (!integration || integration.status !== "connected") {
      throw createError(400, "Strava no está conectado");
    }

    if (!integration.habit_id) {
      throw createError(400, "Strava no tiene un hábito vinculado. Configurá la integración primero");
    }

    const result = await syncActivities(integration.habit_id);

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/github — manually trigger GitHub sync
router.post("/github", async (req, res, next) => {
  try {
    const db = getDb();

    // Check if GitHub is configured via env vars
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_USERNAME) {
      throw createError(400, "GitHub no está configurado. Definí GITHUB_TOKEN y GITHUB_USERNAME en el .env");
    }

    // Get github integration to find linked habit
    const integration = db.prepare("SELECT * FROM integrations WHERE id = 'github'").get();

    if (!integration?.habit_id) {
      throw createError(400, "GitHub no tiene un hábito vinculado. Configurá la integración primero");
    }

    const result = await syncContributions(integration.habit_id);

    // Ensure integration status is "connected" after successful sync
    db.prepare(`
      UPDATE integrations SET status = 'connected', updated_at = ?
      WHERE id = 'github' AND status != 'connected'
    `).run(new Date().toISOString());

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/all — sync all connected integrations
router.post("/all", async (req, res, next) => {
  try {
    const db = getDb();
    const integrations = db.prepare(
      "SELECT id, habit_id, status FROM integrations WHERE status = 'connected'"
    ).all();

    const results = {};

    for (const integration of integrations) {
      if (!integration.habit_id) {
        results[integration.id] = { skipped: true, reason: "Sin hábito vinculado" };
        continue;
      }

      try {
        if (integration.id === "strava") {
          results.strava = await syncActivities(integration.habit_id);
        } else if (integration.id === "github") {
          results.github = await syncContributions(integration.habit_id);
        }
      } catch (err) {
        results[integration.id] = { error: err.message };
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

export default router;
