import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

// GET /api/units — list all units (predefined first, then custom)
router.get("/", (_req, res, next) => {
  try {
    const db = getDb();
    const units = db.prepare(`
      SELECT * FROM units
      ORDER BY is_predefined DESC, name ASC
    `).all();

    res.json(units);
  } catch (err) {
    next(err);
  }
});

// POST /api/units — create custom unit
router.post("/", (req, res, next) => {
  try {
    const db = getDb();
    const { name, abbreviation } = req.body;

    if (!name || !name.trim()) {
      throw createError(400, "El nombre de la unidad es obligatorio");
    }
    if (!abbreviation || !abbreviation.trim()) {
      throw createError(400, "La abreviación es obligatoria");
    }

    // Check uniqueness
    const existingName = db.prepare(
      "SELECT id FROM units WHERE name = ?"
    ).get(name.trim());
    if (existingName) {
      throw createError(409, "Ya existe una unidad con ese nombre");
    }

    const existingAbbr = db.prepare(
      "SELECT id FROM units WHERE abbreviation = ?"
    ).get(abbreviation.trim());
    if (existingAbbr) {
      throw createError(409, "Ya existe una unidad con esa abreviación");
    }

    const result = db.prepare(`
      INSERT INTO units (name, abbreviation, is_predefined)
      VALUES (?, ?, 0)
    `).run(name.trim(), abbreviation.trim());

    const created = db.prepare("SELECT * FROM units WHERE id = ?").get(
      result.lastInsertRowid
    );

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/units/:id — delete custom unit (with protections)
router.delete("/:id", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const unit = db.prepare("SELECT * FROM units WHERE id = ?").get(id);
    if (!unit) {
      throw createError(404, "Unidad no encontrada");
    }

    // Cannot delete predefined units
    if (unit.is_predefined) {
      throw createError(403, "No se puede eliminar una unidad predefinida");
    }

    // Cannot delete if any habit uses it
    const habitUsing = db.prepare(
      "SELECT id FROM habits WHERE unit_id = ? LIMIT 1"
    ).get(id);
    if (habitUsing) {
      throw createError(
        409,
        "No se puede eliminar esta unidad porque está asociada a un hábito"
      );
    }

    db.prepare("DELETE FROM units WHERE id = ?").run(id);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
