import express from "express";
import cors from "cors";
import { initDatabase } from "./db/connection.js";
import { errorHandler } from "./middleware/errorHandler.js";
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
  app.use(cors({ origin: FRONTEND_URL }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/habits", habitsRouter);
  app.use("/api/habits", contributionsRouter);
  app.use("/api/units", unitsRouter);
  app.use("/api/import", importRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api/webhooks", webhooksRouter);

  app.use(errorHandler);

  return app;
}

export { createApp };
