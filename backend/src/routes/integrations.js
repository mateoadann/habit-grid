import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

/**
 * Strips sensitive token fields from an integration row.
 * Returns only safe-to-expose fields.
 */
function sanitizeIntegration(row) {
  if (!row) return null;
  const { access_token, refresh_token, expires_at, ...safe } = row;
  return safe;
}

// GET /api/integrations — list all integrations (tokens hidden)
router.get("/", (_req, res, next) => {
  try {
    const db = getDb();
    const integrations = db.prepare("SELECT * FROM integrations ORDER BY id ASC").all();

    res.json(integrations.map(sanitizeIntegration));
  } catch (err) {
    next(err);
  }
});

// PUT /api/integrations/:id — update integration config (link to habit)
router.put("/:id", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { habit_id, config } = req.body;

    // Validate habit_id if provided (before any DB write)
    if (habit_id) {
      const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(habit_id);
      if (!habit) {
        throw createError(400, "El hábito especificado no existe");
      }
    }

    // Check integration exists
    const existing = db.prepare("SELECT id FROM integrations WHERE id = ?").get(id);
    if (!existing) {
      // Create the integration row if it doesn't exist yet
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO integrations (id, habit_id, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, habit_id || null, config ? JSON.stringify(config) : "{}", now, now);
    } else {
      // Update existing
      const now = new Date().toISOString();
      const updates = [];
      const params = [];

      if (habit_id !== undefined) {
        updates.push("habit_id = ?");
        params.push(habit_id);
        // Reset sync cursor so next sync fetches full history for the new habit
        updates.push("last_sync_at = NULL");
      }
      if (config !== undefined) {
        updates.push("config = ?");
        params.push(JSON.stringify(config));
      }

      updates.push("updated_at = ?");
      params.push(now);
      params.push(id);

      if (updates.length > 1) {
        db.prepare(`UPDATE integrations SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      }
    }

    // Return updated integration (without tokens)
    const updated = db.prepare("SELECT * FROM integrations WHERE id = ?").get(id);
    res.json(sanitizeIntegration(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
