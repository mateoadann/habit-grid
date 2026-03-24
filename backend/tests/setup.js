import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { closeDb, getDb } from "../src/db/connection.js";
import { createApp } from "../src/app.js";

let tempDir;
let authCookie;

const TEST_JWT_SECRET = "test-secret-for-habit-grid";
const TEST_USER = { id: "user_test", username: "testuser" };

export function createTestApp() {
  tempDir = mkdtempSync(join(tmpdir(), "habit-grid-test-"));
  process.env.DB_PATH = join(tempDir, "test.db");
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  const app = createApp();

  // Create test user
  const db = getDb();
  const passwordHash = bcrypt.hashSync("testpass", 4);
  db.prepare(
    "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)"
  ).run(TEST_USER.id, TEST_USER.username, passwordHash);

  // Generate auth cookie
  const token = jwt.sign(TEST_USER, TEST_JWT_SECRET, { expiresIn: "1h" });
  authCookie = `token=${token}`;

  return app;
}

export function getAuthCookie() {
  return authCookie;
}

export function cleanupTestDb() {
  closeDb();
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
