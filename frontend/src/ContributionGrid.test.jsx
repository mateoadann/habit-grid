import { render, waitFor } from "@testing-library/react";
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
// 2. Tooltip text format tests
// ===========================================================================
describe("ContributionGrid tooltips", () => {
  it("shows 'Sin contribuciones el DD/MM' for days with 0 contributions", async () => {
    const { container } = await renderGrid({});

    const titles = container.querySelectorAll("svg title");
    expect(titles.length).toBeGreaterThan(0);

    // All cells have 0 contributions, so every title should start with "Sin contribuciones"
    for (const title of titles) {
      expect(title.textContent).toMatch(/^Sin contribuciones el \d{2}\/\d{2}$/);
    }
  });

  it("shows '1 contribucion el DD/MM' for days with exactly 1 contribution", async () => {
    const today = new Date();
    const dateKey = getDateKey(today);
    const { container } = await renderGrid({ [dateKey]: 1 });

    const titles = Array.from(container.querySelectorAll("svg title"));
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const match = titles.find((t) => t.textContent === `1 contribución el ${dd}/${mm}`);
    expect(match).toBeTruthy();
  });

  it("shows 'X contribuciones el DD/MM' for days with >1 contributions", async () => {
    const today = new Date();
    const dateKey = getDateKey(today);
    const { container } = await renderGrid({ [dateKey]: 5 });

    const titles = Array.from(container.querySelectorAll("svg title"));
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");

    const match = titles.find((t) => t.textContent === `5 contribuciones el ${dd}/${mm}`);
    expect(match).toBeTruthy();
  });
});

// ===========================================================================
// 3. <title> elements are children of <rect> (inside <g>), not standalone
// ===========================================================================
describe("ContributionGrid DOM structure", () => {
  it("renders <title> elements inside <g> elements alongside <rect>", async () => {
    const { container } = await renderGrid({});

    const titles = container.querySelectorAll("svg title");
    expect(titles.length).toBeGreaterThan(0);

    for (const title of titles) {
      // In React source, <title> is a child of <rect> inside <g>.
      // jsdom may hoist <title> to be a sibling of <rect> within <g>.
      // Either way, the parent (or grandparent) must be a <g>.
      const parent = title.parentElement;
      const parentTag = parent.tagName.toLowerCase();

      if (parentTag === "rect") {
        // <title> stayed inside <rect> — verify <rect> is inside <g>
        expect(parent.parentElement.tagName.toLowerCase()).toBe("g");
      } else {
        // jsdom hoisted <title> to <g> — verify sibling <rect> exists
        expect(parentTag).toBe("g");
        expect(parent.querySelector("rect")).toBeTruthy();
      }
    }
  });
});

// ===========================================================================
// 4. Future dates don't have <title> elements
// ===========================================================================
describe("ContributionGrid future dates", () => {
  it("every <g> with a <rect> also has a <title> (no future rects without titles)", async () => {
    // The grid only renders days up to today, so there should be no future
    // date rects. We verify that every <g> containing a <rect> also contains
    // a <title>, confirming no cells were rendered as "future" (which would
    // omit the title).
    const { container } = await renderGrid({});

    const groups = container.querySelectorAll("svg g");
    expect(groups.length).toBeGreaterThan(0);

    for (const g of groups) {
      const rect = g.querySelector("rect");
      if (!rect) continue;
      // <title> may be inside <rect> or hoisted to <g> by jsdom
      const title = g.querySelector("title");
      expect(title).toBeTruthy();
    }
  });

  it("total <title> count matches total <g>-wrapped <rect> count", async () => {
    const { container } = await renderGrid({});

    const dayGroups = Array.from(container.querySelectorAll("svg g")).filter((g) =>
      g.querySelector("rect"),
    );
    const titles = container.querySelectorAll("svg title");

    expect(titles.length).toBe(dayGroups.length);
  });
});
