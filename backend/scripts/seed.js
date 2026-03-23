/**
 * Seed script for habit-grid development data.
 *
 * Usage:
 *   node backend/scripts/seed.js          # asks for confirmation
 *   node backend/scripts/seed.js --force  # skips confirmation
 *
 * This script clears ALL existing habits and contributions,
 * then populates the database with realistic sample data.
 */

import { initDatabase, getDb, closeDb } from "../src/db/connection.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import readline from "node:readline";

// ── Config ───────────────────────────────────────────────────────────

const DAYS_BACK = 90; // ~3 months of data

const HABITS = [
  {
    name: "Lectura",
    emoji: "\uD83D\uDCD6",
    description: "Lectura diaria de libros",
    unitName: "P\u00e1ginas",
    minimum: 20,
    // Strong consistent streak — misses ~5% of days
    generate: (date, dayOfWeek) => {
      if (Math.random() < 0.05) return null; // occasional skip
      const base = 15 + Math.floor(Math.random() * 25); // 15-39 pages
      // Weekends: read more
      return dayOfWeek === 0 || dayOfWeek === 6 ? base + 10 : base;
    },
  },
  {
    name: "Ejercicio",
    emoji: "\uD83C\uDFCB\uFE0F",
    description: "Entrenamiento f\u00edsico",
    unitName: "Minutos",
    minimum: 30,
    // Weekdays mostly on, weekends off with occasional activity
    generate: (date, dayOfWeek) => {
      if (dayOfWeek === 0) return null; // Sunday always off
      if (dayOfWeek === 6) return Math.random() < 0.3 ? 20 + Math.floor(Math.random() * 20) : null;
      if (Math.random() < 0.1) return null; // ~10% weekday skip
      return 25 + Math.floor(Math.random() * 35); // 25-59 min
    },
  },
  {
    name: "Meditaci\u00f3n",
    emoji: "\uD83E\uDDD8",
    description: "Pr\u00e1ctica de meditaci\u00f3n y mindfulness",
    unitName: "Minutos",
    minimum: 10,
    // Sporadic early on, building consistency over time
    generate: (date, _dayOfWeek) => {
      const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
      // Probability increases as we approach today
      const probability = 0.25 + 0.65 * (1 - daysAgo / DAYS_BACK);
      if (Math.random() > probability) return null;
      return 5 + Math.floor(Math.random() * 20); // 5-24 min
    },
  },
  {
    name: "C\u00f3digo",
    emoji: "\uD83D\uDCBB",
    description: "Commits y contribuciones de c\u00f3digo",
    unitName: "Veces",
    minimum: 1,
    // Heavy weekday, light weekend
    generate: (date, dayOfWeek) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return Math.random() < 0.2 ? 1 + Math.floor(Math.random() * 2) : null;
      }
      if (Math.random() < 0.08) return null; // rare weekday miss
      return 1 + Math.floor(Math.random() * 8); // 1-8 commits
    },
  },
  {
    name: "Agua",
    emoji: "\uD83D\uDCA7",
    description: "Vasos de agua por d\u00eda",
    unitName: "Veces",
    minimum: 8,
    // Very consistent — almost never misses, varies 6-12
    generate: () => {
      if (Math.random() < 0.02) return null; // 2% miss
      return 6 + Math.floor(Math.random() * 7); // 6-12 glasses
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generateDates(daysBack) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

async function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────

async function seed() {
  const force = process.argv.includes("--force");

  if (!force) {
    const ok = await confirm(
      "ATENCION: Esto borra TODOS los habitos y contribuciones existentes. Continuar?"
    );
    if (!ok) {
      console.log("Seed cancelado.");
      process.exit(0);
    }
  }

  // Ensure the data directory exists
  const dbPath = process.env.DB_PATH || "data/habits.db";
  mkdirSync(dirname(dbPath), { recursive: true });

  // Initialize DB (creates tables + predefined units if missing)
  const db = initDatabase();

  // Look up unit IDs we need
  const unitRows = db.prepare("SELECT id, name FROM units").all();
  const unitMap = Object.fromEntries(unitRows.map((u) => [u.name, u.id]));

  // Validate all required units exist
  for (const h of HABITS) {
    if (!unitMap[h.unitName]) {
      console.error(`ERROR: Unidad "${h.unitName}" no encontrada en la DB.`);
      console.error("Unidades disponibles:", Object.keys(unitMap).join(", "));
      process.exit(1);
    }
  }

  // Clear existing data (contributions first due to FK)
  console.log("\n--- Limpiando datos existentes ---");
  const deletedContribs = db.prepare("DELETE FROM contributions").run();
  const deletedHabits = db.prepare("DELETE FROM habits").run();
  console.log(`  Contribuciones eliminadas: ${deletedContribs.changes}`);
  console.log(`  Habitos eliminados: ${deletedHabits.changes}`);

  // Generate dates
  const dates = generateDates(DAYS_BACK);

  // Insert everything in a transaction
  const insertHabit = db.prepare(`
    INSERT INTO habits (id, name, emoji, description, unit_id, minimum, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertContrib = db.prepare(`
    INSERT INTO contributions (habit_id, date, count, source)
    VALUES (?, ?, ?, 'manual')
  `);

  const stats = [];

  const seedAll = db.transaction(() => {
    for (const habit of HABITS) {
      const habitId = `habit_seed_${habit.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_")}`;
      const now = new Date().toISOString();

      insertHabit.run(
        habitId,
        habit.name,
        habit.emoji,
        habit.description,
        unitMap[habit.unitName],
        habit.minimum,
        now,
        now
      );

      let contribCount = 0;
      let aboveMinimum = 0;

      for (const date of dates) {
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
        const count = habit.generate(date, dayOfWeek);
        if (count != null && count > 0) {
          insertContrib.run(habitId, formatDate(date), count);
          contribCount++;
          if (count >= habit.minimum) aboveMinimum++;
        }
      }

      stats.push({
        name: habit.name,
        emoji: habit.emoji,
        id: habitId,
        contributions: contribCount,
        totalDays: dates.length,
        completionRate: ((aboveMinimum / dates.length) * 100).toFixed(1),
      });
    }
  });

  seedAll();

  // Print summary
  console.log(`\n--- Seed completado ---`);
  console.log(`Periodo: ${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])} (${dates.length} dias)\n`);

  console.log("Habitos creados:");
  console.log("-".repeat(72));
  console.log(
    "Emoji  Nombre          Contribuciones  Dias Totales  Tasa Completado"
  );
  console.log("-".repeat(72));

  for (const s of stats) {
    const name = s.name.padEnd(15);
    const contribs = String(s.contributions).padStart(6);
    const total = String(s.totalDays).padStart(6);
    const rate = `${s.completionRate}%`.padStart(10);
    console.log(`${s.emoji}     ${name} ${contribs}          ${total}       ${rate}`);
  }

  console.log("-".repeat(72));
  console.log(`\nTotal: ${stats.length} habitos, ${stats.reduce((a, s) => a + s.contributions, 0)} contribuciones\n`);

  closeDb();
}

seed().catch((err) => {
  console.error("Error durante el seed:", err);
  process.exit(1);
});
