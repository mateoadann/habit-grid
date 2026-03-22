import Database from "better-sqlite3";
import path from "path";
import { createTables } from "./schema.js";

let db = null;

function getDbPath() {
  return process.env.DB_PATH || path.join(process.cwd(), "data", "habits.db");
}

function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
  }
  return db;
}

function initDatabase() {
  const database = getDb();
  createTables(database);
  console.log("Base de datos inicializada en:", getDbPath());
  return database;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export { getDb, initDatabase, closeDb };
