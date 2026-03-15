function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";

  res.status(status).json({ error: message });
}

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export { errorHandler, createError };
