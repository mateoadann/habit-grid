import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp, getAuthCookie, cleanupTestDb } from "./setup.js";

let app;
let cookie;

beforeAll(() => {
  app = createTestApp();
  cookie = getAuthCookie();
});

afterAll(() => {
  cleanupTestDb();
});

describe("GET /api/habits", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/habits");
    expect(res.status).toBe(401);
  });

  it("returns an empty array when no habits exist", async () => {
    const res = await request(app).get("/api/habits").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/habits", () => {
  it("creates a habit and returns 201", async () => {
    const res = await request(app).post("/api/habits").set("Cookie", cookie).send({
      name: "Read",
      emoji: "📖",
      description: "Read every day",
      unit_id: 1,
      minimum: 30,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Read",
      emoji: "📖",
      description: "Read every day",
      unit_id: 1,
      minimum: 30,
    });
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("unit_name");
    expect(res.body).toHaveProperty("unit_abbreviation");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/habits").set("Cookie", cookie).send({
      unit_id: 1,
      minimum: 10,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when unit_id is missing", async () => {
    const res = await request(app).post("/api/habits").set("Cookie", cookie).send({
      name: "Exercise",
      minimum: 10,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when minimum is 0 or negative", async () => {
    const res = await request(app).post("/api/habits").set("Cookie", cookie).send({
      name: "Exercise",
      unit_id: 1,
      minimum: 0,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/habits after creation", () => {
  it("returns the created habits", async () => {
    const res = await request(app).get("/api/habits").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/habits/:id", () => {
  it("returns a single habit by id", async () => {
    const listRes = await request(app).get("/api/habits").set("Cookie", cookie);
    const habitId = listRes.body[0].id;

    const res = await request(app).get(`/api/habits/${habitId}`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", habitId);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 404 for non-existent habit", async () => {
    const res = await request(app).get("/api/habits/nonexistent_id").set("Cookie", cookie);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PUT /api/habits/:id", () => {
  it("updates an existing habit", async () => {
    const listRes = await request(app).get("/api/habits").set("Cookie", cookie);
    const habitId = listRes.body[0].id;

    const res = await request(app).put(`/api/habits/${habitId}`).set("Cookie", cookie).send({
      name: "Read Books",
      emoji: "📚",
      description: "Updated description",
      unit_id: 1,
      minimum: 45,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: habitId,
      name: "Read Books",
      emoji: "📚",
      minimum: 45,
    });
  });

  it("returns 404 for non-existent habit", async () => {
    const res = await request(app).put("/api/habits/nonexistent_id").set("Cookie", cookie).send({
      name: "Nope",
      unit_id: 1,
      minimum: 1,
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/habits/:id", () => {
  it("deletes an existing habit", async () => {
    const createRes = await request(app).post("/api/habits").set("Cookie", cookie).send({
      name: "To Delete",
      unit_id: 1,
      minimum: 1,
    });
    const habitId = createRes.body.id;

    const res = await request(app).delete(`/api/habits/${habitId}`).set("Cookie", cookie);

    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/habits/${habitId}`).set("Cookie", cookie);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for non-existent habit", async () => {
    const res = await request(app).delete("/api/habits/nonexistent_id").set("Cookie", cookie);

    expect(res.status).toBe(404);
  });
});
