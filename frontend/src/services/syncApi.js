import { apiPost } from "./api.js";

async function syncStrava() {
  return apiPost("/sync/strava");
}

async function syncGitHub() {
  return apiPost("/sync/github");
}

async function syncAll() {
  return apiPost("/sync/all");
}

export { syncStrava, syncGitHub, syncAll };
