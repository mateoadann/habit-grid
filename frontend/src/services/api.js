const BASE_URL = import.meta.env.VITE_API_URL || "/api";

let onUnauthorized = null;

function setOnUnauthorized(callback) {
  onUnauthorized = callback;
}

async function handleResponse(response) {
  if (response.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error("No autenticado");
  }
  if (!response.ok) {
    let message = "Error del servidor";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch (_) {
      // no parseable body
    }
    throw new Error(message);
  }
  return response;
}

async function apiGet(path) {
  const response = await fetch(BASE_URL + path, { credentials: "include" });
  await handleResponse(response);
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  await handleResponse(response);
  return response.json();
}

async function apiPut(path, body) {
  const response = await fetch(BASE_URL + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  await handleResponse(response);
  return response.json();
}

async function apiDelete(path) {
  const response = await fetch(BASE_URL + path, {
    method: "DELETE",
    credentials: "include",
  });
  if (response.status === 204) return response;
  await handleResponse(response);
  return response;
}

export { apiGet, apiPost, apiPut, apiDelete, setOnUnauthorized };
