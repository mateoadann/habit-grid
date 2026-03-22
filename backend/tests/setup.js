import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { closeDb } from "../src/db/connection.js";
import { createApp } from "../src/app.js";

let tempDir;

export function createTestApp() {
  tempDir = mkdtempSync(join(tmpdir(), "habit-grid-test-"));
  process.env.DB_PATH = join(tempDir, "test.db");
  return createApp();
}

export function cleanupTestDb() {
  closeDb();
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
