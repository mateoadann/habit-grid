import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/connection.js";
import { getAuthorizationUrl, exchangeCodeForTokens } from "../services/strava.js";
import { requireAuth, getJwtSecret } from "../middleware/auth.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

// POST /api/auth/login
router.post("/login", (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username y password son obligatorios" });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.cookie("token", token, getCookieOptions());
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});

// GET /api/auth/me — current user (protected)
router.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

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
