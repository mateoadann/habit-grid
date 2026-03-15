import { Router } from "express";
import { getDb } from "../db/connection.js";
import { syncActivities } from "../services/strava.js";

const router = Router();

// GET /api/webhooks/strava — Strava webhook validation (subscription verification)
router.get("/strava", (req, res) => {
  const verifyToken = process.env.STRAVA_VERIFY_TOKEN;
  const hubMode = req.query["hub.mode"];
  const hubChallenge = req.query["hub.challenge"];
  const hubVerifyToken = req.query["hub.verify_token"];

  if (hubMode === "subscribe" && hubVerifyToken === verifyToken) {
    console.log("[Webhook] Suscripción de Strava verificada");
    return res.json({ "hub.challenge": hubChallenge });
  }

  console.warn("[Webhook] Verificación de Strava fallida — token no coincide");
  res.status(403).json({ error: "Token de verificación inválido" });
});

// POST /api/webhooks/strava — Receive Strava events
router.post("/strava", async (req, res) => {
  // Always respond 200 quickly — Strava expects it
  const event = req.body;

  console.log("[Webhook] Evento de Strava recibido:", JSON.stringify(event));

  // Process async (don't block the response)
  if (event.object_type === "activity" && event.aspect_type === "create") {
    // Trigger sync for the linked habit (fire and forget)
    setImmediate(async () => {
      try {
        const db = getDb();
        const integration = db.prepare(
          "SELECT habit_id FROM integrations WHERE id = 'strava' AND status = 'connected'"
        ).get();

        if (integration?.habit_id) {
          const result = await syncActivities(integration.habit_id);
          console.log(`[Webhook] Sync de Strava completado: ${result.synced} días sincronizados`);
        } else {
          console.warn("[Webhook] No hay hábito vinculado a Strava, ignorando evento");
        }
      } catch (err) {
        console.error("[Webhook] Error al sincronizar tras evento de Strava:", err.message);
      }
    });
  }

  res.status(200).json({ received: true });
});

export default router;
