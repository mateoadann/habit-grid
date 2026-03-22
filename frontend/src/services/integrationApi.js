import { apiGet, apiPut } from "./api.js";

async function getIntegrations() {
  return apiGet("/integrations");
}

async function updateIntegration(id, data) {
  return apiPut("/integrations/" + id, data);
}

export { getIntegrations, updateIntegration };
