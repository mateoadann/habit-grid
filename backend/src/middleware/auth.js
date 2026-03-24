import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado en las variables de entorno");
  }
  return secret;
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = payload;
    next();
  } catch {
    res.clearCookie("token");
    return res.status(401).json({ error: "Sesión expirada" });
  }
}

export { requireAuth, getJwtSecret };
