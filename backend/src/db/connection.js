import Database from "better-sqlite3";
import path from "path";
import { createTables } from "./schema.js";

const DB_PATH = path.join(process.cwd(), "data", "habits.db");

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
  }
  return db;
}

function initDatabase() {
  const database = getDb();
  createTables(database);
  console.log("Base de datos inicializada en:", DB_PATH);
  return database;
}

export { getDb, initDatabase };
