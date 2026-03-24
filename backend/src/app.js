import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initDatabase } from "./db/connection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import habitsRouter from "./routes/habits.js";
import contributionsRouter from "./routes/contributions.js";
import unitsRouter from "./routes/units.js";
import importRouter from "./routes/import.js";
import authRouter from "./routes/auth.js";
import syncRouter from "./routes/sync.js";
import integrationsRouter from "./routes/integrations.js";
import webhooksRouter from "./routes/webhooks.js";

function createApp() {
  initDatabase();

  const app = express();
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: FRONTEND_URL, credentials: true }));

  // Public routes (no auth required)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/webhooks", webhooksRouter);

  // Protected routes (auth required)
  app.use("/api/habits", requireAuth, habitsRouter);
  app.use("/api/habits", requireAuth, contributionsRouter);
  app.use("/api/units", requireAuth, unitsRouter);
  app.use("/api/import", requireAuth, importRouter);
  app.use("/api/sync", requireAuth, syncRouter);
  app.use("/api/integrations", requireAuth, integrationsRouter);

  app.use(errorHandler);

  return app;
}

export { createApp };
