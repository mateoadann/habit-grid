import { apiGet, apiPost } from "./api.js";

async function getContributions(habitId, from, to) {
  let path = "/habits/" + habitId + "/contributions";
  const params = [];
  if (from) params.push("from=" + from);
  if (to) params.push("to=" + to);
  if (params.length) path += "?" + params.join("&");
  return apiGet(path);
}

async function logContribution(habitId, date, count) {
  return apiPost("/habits/" + habitId + "/contributions", { date, count });
}

export { getContributions, logContribution };
