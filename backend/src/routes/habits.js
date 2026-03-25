import { Router } from "express";
import { getDb } from "../db/connection.js";
import { createError } from "../middleware/errorHandler.js";

const router = Router();

// GET /api/habits — list all habits with unit info
router.get("/", (req, res, next) => {
  try {
    const db = getDb();
    const habits = db.prepare(`
      SELECT h.*, u.name AS unit_name, u.abbreviation AS unit_abbreviation
      FROM habits h
      JOIN units u ON h.unit_id = u.id
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC
    `).all(req.user.id);

    res.json(habits);
  } catch (err) {
    next(err);
  }
});

// GET /api/habits/:id — single habit with unit info
router.get("/:id", (req, res, next) => {
  try {
    const db = getDb();
    const habit = db.prepare(`
      SELECT h.*, u.name AS unit_name, u.abbreviation AS unit_abbreviation
      FROM habits h
      JOIN units u ON h.unit_id = u.id
      WHERE h.id = ? AND h.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!habit) {
      throw createError(404, "Hábito no encontrado");
    }

    res.json(habit);
  } catch (err) {
    next(err);
  }
});

// POST /api/habits — create habit
router.post("/", (req, res, next) => {
  try {
    const db = getDb();
    const { name, emoji, description, unit_id, minimum, type } = req.body;

    // Validation
    if (!name || !name.trim()) {
      throw createError(400, "El nombre del hábito es obligatorio");
    }
    if (!unit_id) {
      throw createError(400, "La unidad de medida es obligatoria");
    }
    if (minimum === undefined || minimum === null || minimum <= 0) {
      throw createError(400, "El mínimo debe ser mayor a 0");
    }

    const VALID_TYPES = ["positive", "quit"];
    const habitType = type || "positive";
    if (!VALID_TYPES.includes(habitType)) {
      throw createError(400, "Tipo de hábito inválido");
    }

    // Verify unit exists
    const unit = db.prepare("SELECT id FROM units WHERE id = ?").get(unit_id);
    if (!unit) {
      throw createError(400, "La unidad de medida no existe");
    }

    const id = "habit_" + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO habits (id, name, emoji, description, unit_id, minimum, type, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), emoji || "🎯", description || "", unit_id, minimum, habitType, req.user.id, now, now);

    // Return created habit with unit info
    const created = db.prepare(`
      SELECT h.*, u.name AS unit_name, u.abbreviation AS unit_abbreviation
      FROM habits h
      JOIN units u ON h.unit_id = u.id
      WHERE h.id = ?
    `).get(id);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/:id — update habit
router.put("/:id", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, emoji, description, unit_id, minimum, type } = req.body;

    // Check habit exists
    const existing = db.prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!existing) {
      throw createError(404, "Hábito no encontrado");
    }

    // Validation
    if (!name || !name.trim()) {
      throw createError(400, "El nombre del hábito es obligatorio");
    }
    if (!unit_id) {
      throw createError(400, "La unidad de medida es obligatoria");
    }
    if (minimum === undefined || minimum === null || minimum <= 0) {
      throw createError(400, "El mínimo debe ser mayor a 0");
    }

    const VALID_TYPES = ["positive", "quit"];
    const habitType = type || "positive";
    if (!VALID_TYPES.includes(habitType)) {
      throw createError(400, "Tipo de hábito inválido");
    }

    // Verify unit exists
    const unit = db.prepare("SELECT id FROM units WHERE id = ?").get(unit_id);
    if (!unit) {
      throw createError(400, "La unidad de medida no existe");
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE habits
      SET name = ?, emoji = ?, description = ?, unit_id = ?, minimum = ?, type = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), emoji || "🎯", description || "", unit_id, minimum, habitType, now, id, req.user.id);

    // Return updated habit with unit info
    const updated = db.prepare(`
      SELECT h.*, u.name AS unit_name, u.abbreviation AS unit_abbreviation
      FROM habits h
      JOIN units u ON h.unit_id = u.id
      WHERE h.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habits/:id — delete habit (CASCADE deletes contributions)
router.delete("/:id", (req, res, next) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!existing) {
      throw createError(404, "Hábito no encontrado");
    }

    db.prepare("DELETE FROM habits WHERE id = ? AND user_id = ?").run(id, req.user.id);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
