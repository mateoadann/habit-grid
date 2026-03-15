import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/habits/:id/contributions — get contributions for a habit
router.get("/:id/contributions", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // Verify habit exists
    const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(id);
    if (!habit) {
      throw createError(404, "Hábito no encontrado");
    }

    // Date range defaults to last 365 days
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 365);

    const from = req.query.from || defaultFrom.toISOString().split("T")[0];
    const to = req.query.to || now.toISOString().split("T")[0];

    if (!DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
      throw createError(400, "Formato de fecha inválido. Usá YYYY-MM-DD");
    }

    const contributions = db.prepare(`
      SELECT date, count, source, metadata
      FROM contributions
      WHERE habit_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(id, from, to);

    // Parse metadata JSON
    const parsed = contributions.map((c) => ({
      ...c,
      metadata: JSON.parse(c.metadata),
    }));

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

// POST /api/habits/:id/contributions — create/update manual contribution
router.post("/:id/contributions", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { date, count } = req.body;

    // Verify habit exists
    const habit = db.prepare("SELECT id FROM habits WHERE id = ?").get(id);
    if (!habit) {
      throw createError(404, "Hábito no encontrado");
    }

    // Validate date
    if (!date || !DATE_REGEX.test(date)) {
      throw createError(400, "Fecha inválida. Usá el formato YYYY-MM-DD");
    }

    // Validate count
    if (count === undefined || count === null || count < 0) {
      throw createError(400, "El count debe ser mayor o igual a 0");
    }

    const source = "manual";

    // UPSERT: INSERT OR REPLACE on UNIQUE(habit_id, date, source)
    db.prepare(`
      INSERT INTO contributions (habit_id, date, count, source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(habit_id, date, source) DO UPDATE SET
        count = excluded.count
    `).run(id, date, count, source);

    // Return created/updated contribution
    const contribution = db.prepare(`
      SELECT date, count, source, metadata
      FROM contributions
      WHERE habit_id = ? AND date = ? AND source = ?
    `).get(id, date, source);

    res.status(201).json({
      ...contribution,
      metadata: JSON.parse(contribution.metadata),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
