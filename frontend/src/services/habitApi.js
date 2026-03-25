import { apiGet, apiPost, apiPut, apiDelete } from "./api.js";

async function getAllHabits() {
  return apiGet("/habits");
}

async function getHabit(id) {
  return apiGet("/habits/" + id);
}

async function createHabit({ name, emoji, description, unit_id, minimum, type }) {
  return apiPost("/habits", { name, emoji, description, unit_id, minimum, type });
}

async function updateHabit(id, data) {
  return apiPut("/habits/" + id, data);
}

async function deleteHabit(id) {
  return apiDelete("/habits/" + id);
}

export { getAllHabits, getHabit, createHabit, updateHabit, deleteHabit };
