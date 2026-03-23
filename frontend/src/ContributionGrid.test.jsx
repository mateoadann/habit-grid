import { render, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import HabitTracker from "./App.jsx";

// ---------------------------------------------------------------------------
// Mock ALL service modules so HabitTracker renders without network calls
// ---------------------------------------------------------------------------
vi.mock("./services/habitApi.js", () => ({
  getAllHabits: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

vi.mock("./services/contributionApi.js", () => ({
  getContributions: vi.fn(),
  logContribution: vi.fn(),
}));

vi.mock("./services/unitApi.js", () => ({
  getAllUnits: vi.fn(),
  createUnit: vi.fn(),
  deleteUnit: vi.fn(),
}));

vi.mock("./services/integrationApi.js", () => ({
  getIntegrations: vi.fn(),
  updateIntegration: vi.fn(),
}));

vi.mock("./services/syncApi.js", () => ({
  syncStrava: vi.fn(),
  syncGitHub: vi.fn(),
}));

import { getAllHabits } from "./services/habitApi.js";
import { getContributions } from "./services/contributionApi.js";
import { getAllUnits } from "./services/unitApi.js";
import { getIntegrations } from "./services/integrationApi.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replicates the getDateKey logic from App.jsx */
function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Replicates getLevel from App.jsx for unit testing */
function getLevel(value, minimum, max) {
  if (value === 0) return 0;
  if (value < minimum) return 0;
  if (max <= minimum) return 1;
  const quartile = (max - minimum) / 4;
  if (value < minimum + quartile) return 1;
  if (value < minimum + quartile * 2) return 2;
  if (value < minimum + quartile * 3) return 3;
  return 4;
}

/**
 * Builds a contributions array (API response format) from a { dateKey: count } map.
 */
function buildContribResponse(map) {
  return Object.entries(map).map(([date, count]) => ({ date, count, source: "manual" }));
}

// ---------------------------------------------------------------------------
// Setup: single habit with known contributions
// ---------------------------------------------------------------------------
const HABIT = {
  id: 1,
  name: "Leer",
  emoji: "\uD83D\uDCDA",
  description: "",
  unit_id: 1,
  minimum: 1,
  unit_abbreviation: "pag",
};

const UNITS = [{ id: 1, name: "Paginas", abbreviation: "pag", is_predefined: true }];

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Renders HabitTracker with one habit and given contributions, waits for loading
 * to finish, then returns the container.
 */
async function renderGrid(contribMap) {
  getAllHabits.mockResolvedValue([HABIT]);
  getAllUnits.mockResolvedValue(UNITS);
  getIntegrations.mockResolvedValue([]);
  getContributions.mockResolvedValue(buildContribResponse(contribMap));

  const result = render(<HabitTracker />);

  // Wait until loading spinner disappears
  await waitFor(() => {
    expect(result.container.querySelector("svg")).toBeTruthy();
  });

  return result;
}

// ===========================================================================
// 1. Unit tests for getLevel (quartile-based color levels)
// ===========================================================================
describe("getLevel", () => {
  it("returns 0 for value 0", () => {
    expect(getLevel(0, 1, 10)).toBe(0);
  });

  it("returns 0 when value < minimum", () => {
    expect(getLevel(2, 5, 20)).toBe(0);
  });

  it("returns 1 when max <= minimum", () => {
    expect(getLevel(5, 5, 5)).toBe(1);
  });

  it("returns correct quartile levels for range 1-100", () => {
    // quartile = (100-1)/4 = 24.75
    // L1: [1, 25.75), L2: [25.75, 50.5), L3: [50.5, 75.25), L4: [75.25, 100]
    expect(getLevel(1, 1, 100)).toBe(1);
    expect(getLevel(25, 1, 100)).toBe(1);
    expect(getLevel(26, 1, 100)).toBe(2);
    expect(getLevel(50, 1, 100)).toBe(2);
    expect(getLevel(51, 1, 100)).toBe(3);
    expect(getLevel(75, 1, 100)).toBe(3);
    expect(getLevel(76, 1, 100)).toBe(4);
    expect(getLevel(100, 1, 100)).toBe(4);
  });
});

// ===========================================================================
// 2. Tooltip text format tests (CSS tooltip via mouseEnter on <rect>)
// ===========================================================================
describe("ContributionGrid tooltips", () => {
  it("shows 'Sin contribuciones el DD/MM' for days with 0 contributions", async () => {
    const { container } = await renderGrid({});

    // Pick the first non-future rect (has cursor: pointer)
    const rects = Array.from(container.querySelectorAll("svg rect")).filter(
      (r) => r.style.cursor === "pointer",
    );
    expect(rects.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(rects[0]);

    await waitFor(() => {
      const tooltip = container.parentElement.querySelector("div[style*='position: fixed']");
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent).toMatch(/^Sin contribuciones el \d{2}\/\d{2}$/);
    });
  });

  it("shows '1 contribucion el DD/MM' for days with exactly 1 contribution", async () => {
    const today = new Date();
    const dateKey = getDateKey(today);
    const { container } = await renderGrid({ [dateKey]: 1 });

    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    // Find the rect for today — it has a stroke (today marker)
    const rects = Array.from(container.querySelectorAll("svg rect")).filter(
      (r) => r.style.cursor === "pointer",
    );
    expect(rects.length).toBeGreaterThan(0);

    // Hover each rect until we find the one with the right tooltip text
    let found = false;
    for (const rect of rects) {
      fireEvent.mouseEnter(rect);
      await waitFor(() => {
        const tooltip = container.parentElement.querySelector("div[style*='position: fixed']");
        if (tooltip && tooltip.textContent === `1 contribución el ${dd}/${mm}`) {
          found = true;
        }
      });
      if (found) break;
      fireEvent.mouseLeave(rect);
    }
    expect(found).toBe(true);
  });

  it("shows 'X contribuciones el DD/MM' for days with >1 contributions", async () => {
    const today = new Date();
    const dateKey = getDateKey(today);
    const { container } = await renderGrid({ [dateKey]: 5 });

    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const rects = Array.from(container.querySelectorAll("svg rect")).filter(
      (r) => r.style.cursor === "pointer",
    );
    expect(rects.length).toBeGreaterThan(0);

    let found = false;
    for (const rect of rects) {
      fireEvent.mouseEnter(rect);
      await waitFor(() => {
        const tooltip = container.parentElement.querySelector("div[style*='position: fixed']");
        if (tooltip && tooltip.textContent === `5 contribuciones el ${dd}/${mm}`) {
          found = true;
        }
      });
      if (found) break;
      fireEvent.mouseLeave(rect);
    }
    expect(found).toBe(true);
  });
});

// ===========================================================================
// 3. DOM structure — rects are direct children of <svg> (no <g> wrappers)
// ===========================================================================
describe("ContributionGrid DOM structure", () => {
  it("renders <rect> elements directly inside the <svg> without <g> wrappers", async () => {
    const { container } = await renderGrid({});

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    const rects = svg.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);

    // Every rect's direct parent should be the <svg> itself
    for (const rect of rects) {
      expect(rect.parentElement.tagName.toLowerCase()).toBe("svg");
    }
  });
});

// ===========================================================================
// 4. Future dates don't trigger tooltips
// ===========================================================================
describe("ContributionGrid future dates", () => {
  it("future date rects have cursor: default and do not show tooltip on hover", async () => {
    const { container } = await renderGrid({});

    const futureRects = Array.from(container.querySelectorAll("svg rect")).filter(
      (r) => r.style.cursor === "default",
    );

    // There may or may not be future rects depending on the current day of
    // the week. If there are any, hovering them should NOT produce a tooltip.
    for (const rect of futureRects) {
      fireEvent.mouseEnter(rect);
    }

    // No tooltip div should be visible
    const tooltip = container.parentElement.querySelector("div[style*='position: fixed']");
    expect(tooltip).toBeFalsy();
  });

  it("non-future rect count matches rects with cursor: pointer", async () => {
    const { container } = await renderGrid({});

    const allRects = container.querySelectorAll("svg rect");
    const pointerRects = Array.from(allRects).filter((r) => r.style.cursor === "pointer");
    const defaultRects = Array.from(allRects).filter((r) => r.style.cursor === "default");

    expect(pointerRects.length + defaultRects.length).toBe(allRects.length);
  });
});
