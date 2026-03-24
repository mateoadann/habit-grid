import "dotenv/config";
import bcrypt from "bcryptjs";
import { initDatabase, getDb, closeDb } from "../db/connection.js";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Uso: node src/scripts/create-user.js <username> <password>");
  process.exit(1);
}

const [username, password] = args;

if (password.length < 6) {
  console.error("Error: La contraseña debe tener al menos 6 caracteres");
  process.exit(1);
}

try {
  initDatabase();
  const db = getDb();

  // Check if user already exists
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    console.error(`Error: El usuario '${username}' ya existe`);
    process.exit(1);
  }

  const id = "user_" + Date.now();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)"
  ).run(id, username, passwordHash);

  // Associate orphan data (habits and integrations without user_id) to this user
  const orphanHabits = db.prepare(
    "UPDATE habits SET user_id = ? WHERE user_id IS NULL"
  ).run(id);

  const orphanIntegrations = db.prepare(
    "UPDATE integrations SET user_id = ? WHERE user_id IS NULL"
  ).run(id);

  console.log(`Usuario '${username}' creado (id: ${id})`);
  if (orphanHabits.changes > 0) {
    console.log(`  -> ${orphanHabits.changes} hábito(s) asociado(s)`);
  }
  if (orphanIntegrations.changes > 0) {
    console.log(`  -> ${orphanIntegrations.changes} integración(es) asociada(s)`);
  }

  closeDb();
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
