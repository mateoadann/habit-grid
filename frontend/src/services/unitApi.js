import { apiGet, apiPost, apiDelete } from "./api.js";

async function getAllUnits() {
  return apiGet("/units");
}

async function createUnit({ name, abbreviation }) {
  return apiPost("/units", { name, abbreviation });
}

async function deleteUnit(id) {
  return apiDelete("/units/" + id);
}

export { getAllUnits, createUnit, deleteUnit };
