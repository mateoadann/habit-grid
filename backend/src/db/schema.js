function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      abbreviation TEXT NOT NULL UNIQUE,
      is_predefined INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '🎯',
      description TEXT DEFAULT '',
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
      minimum REAL NOT NULL DEFAULT 1,
      user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'manual',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(habit_id, date, source)
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      config TEXT NOT NULL DEFAULT '{}',
      last_sync_at TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contributions_habit_date
      ON contributions(habit_id, date);

    CREATE INDEX IF NOT EXISTS idx_contributions_date
      ON contributions(date);

    CREATE INDEX IF NOT EXISTS idx_habits_unit
      ON habits(unit_id);
  `);

  // Seed predefined units
  const insertUnit = db.prepare(
    "INSERT OR IGNORE INTO units (name, abbreviation, is_predefined) VALUES (?, ?, 1)"
  );

  const PREDEFINED_UNITS = [
    ["Veces", "vec"],
    ["Minutos", "min"],
    ["Horas", "hs"],
    ["Páginas", "pág"],
    ["Kilómetros", "km"],
    ["Litros", "lt"],
    ["Repeticiones", "rep"],
  ];

  const seedUnits = db.transaction(() => {
    for (const [name, abbreviation] of PREDEFINED_UNITS) {
      insertUnit.run(name, abbreviation);
    }
  });

  seedUnits();

  // Migrations for existing databases
  runMigrations(db);

  // Set schema version
  db.prepare(
    "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '2')"
  ).run();
}

function runMigrations(db) {
  // Migration: add user_id to habits if missing
  const habitsColumns = db.prepare("PRAGMA table_info(habits)").all();
  if (!habitsColumns.find((c) => c.name === "user_id")) {
    db.exec("ALTER TABLE habits ADD COLUMN user_id TEXT REFERENCES users(id)");
  }

  // Migration: add user_id to integrations if missing
  const integrationsColumns = db.prepare("PRAGMA table_info(integrations)").all();
  if (!integrationsColumns.find((c) => c.name === "user_id")) {
    db.exec("ALTER TABLE integrations ADD COLUMN user_id TEXT REFERENCES users(id)");
  }
}

export { createTables };
