import { describe, it, expect } from "vitest";
import { getAllHabits, getHabit, createHabit, updateHabit, deleteHabit } from "../../src/services/habitApi.js";

describe("habitApi", () => {
  it("exports getAllHabits as a function", () => {
    expect(typeof getAllHabits).toBe("function");
  });

  it("exports getHabit as a function", () => {
    expect(typeof getHabit).toBe("function");
  });

  it("exports createHabit as a function", () => {
    expect(typeof createHabit).toBe("function");
  });

  it("exports updateHabit as a function", () => {
    expect(typeof updateHabit).toBe("function");
  });

  it("exports deleteHabit as a function", () => {
    expect(typeof deleteHabit).toBe("function");
  });
});
