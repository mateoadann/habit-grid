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
router.get("/", (req, res, next) => {
  try {
    const db = getDb();
    const integrations = db.prepare("SELECT * FROM integrations WHERE user_id = ? ORDER BY id ASC").all(req.user.id);

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
      const habit = db.prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?").get(habit_id, req.user.id);
      if (!habit) {
        throw createError(400, "El hábito especificado no existe");
      }
    }

    // Check integration exists for this user
    const existing = db.prepare("SELECT id FROM integrations WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!existing) {
      // Create the integration row if it doesn't exist yet
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO integrations (id, habit_id, config, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, habit_id || null, config ? JSON.stringify(config) : "{}", req.user.id, now, now);
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
        db.prepare(`UPDATE integrations SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...params, req.user.id);
      }
    }

    // Return updated integration (without tokens)
    const updated = db.prepare("SELECT * FROM integrations WHERE id = ? AND user_id = ?").get(id, req.user.id);
    res.json(sanitizeIntegration(updated));
  } catch (err) {
    next(err);
  }
});

export default router;
