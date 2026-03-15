import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

const DEFAULT_UNIT_ID = 1; // "Veces" — first predefined unit

// POST /api/import — import data from localStorage format
router.post("/", (req, res, next) => {
  try {
    const db = getDb();
    const { habits, contributions } = req.body;

    if (!habits || !Array.isArray(habits)) {
      throw createError(400, "El campo 'habits' debe ser un array");
    }
    if (!contributions || typeof contributions !== "object") {
      throw createError(400, "El campo 'contributions' debe ser un objeto");
    }

    let importedHabits = 0;
    let importedContributions = 0;

    const insertHabit = db.prepare(`
      INSERT OR IGNORE INTO habits (id, name, emoji, description, unit_id, minimum, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertContribution = db.prepare(`
      INSERT OR IGNORE INTO contributions (habit_id, date, count, source)
      VALUES (?, ?, ?, 'manual')
    `);

    const importAll = db.transaction(() => {
      // Import habits
      for (const habit of habits) {
        if (!habit.id || !habit.name) continue;

        const result = insertHabit.run(
          habit.id,
          habit.name,
          habit.emoji || "🎯",
          habit.description || "",
          DEFAULT_UNIT_ID,
          1,
          habit.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );

        if (result.changes > 0) {
          importedHabits++;
        }
      }

      // Import contributions
      for (const [habitId, dates] of Object.entries(contributions)) {
        if (!dates || typeof dates !== "object") continue;

        for (const [date, count] of Object.entries(dates)) {
          if (!date || count === undefined) continue;

          const result = insertContribution.run(habitId, date, count);

          if (result.changes > 0) {
            importedContributions++;
          }
        }
      }
    });

    importAll();

    res.json({
      imported: {
        habits: importedHabits,
        contributions: importedContributions,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
