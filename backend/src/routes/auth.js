import { Router } from "express";
import { getAuthorizationUrl, exchangeCodeForTokens } from "../services/strava.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// GET /api/auth/strava — redirect to Strava OAuth page
router.get("/strava", (_req, res, next) => {
  try {
    const authUrl = getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/strava/callback — handle OAuth callback from Strava
router.get("/strava/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${FRONTEND_URL}?strava=error&reason=no_code`);
    }

    await exchangeCodeForTokens(code);

    res.redirect(`${FRONTEND_URL}?strava=connected`);
  } catch (err) {
    console.error("[Auth] Error en callback de Strava:", err.message);
    res.redirect(`${FRONTEND_URL}?strava=error`);
  }
});

export default router;
