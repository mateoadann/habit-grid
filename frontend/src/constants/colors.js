// Grid color palette — GitHub-style contribution levels
const COLORS = {
  empty: "rgba(255,255,255,0.04)",
  l1: "#0e4429",
  l2: "#006d32",
  l3: "#26a641",
  l4: "#39d353",
};

// Red palette for quit-habit relapse intensity
const RED_COLORS = {
  empty: "rgba(255,255,255,0.04)",
  r1: "#8b2029",
  r2: "#d1343e",
  r3: "#ff4d58",
  r4: "#ff6b73",
};

/**
 * Returns the fill color for a given contribution level (0-4).
 * @param {number} level - 0 = empty, 1-4 = increasing intensity
 * @returns {string} CSS color value
 */
function getColor(level) {
  return [COLORS.empty, COLORS.l1, COLORS.l2, COLORS.l3, COLORS.l4][level];
}

/**
 * Returns the red fill color for a given quit-habit relapse level (0-4).
 * @param {number} level - 0 = empty, 1-4 = increasing relapse intensity
 * @returns {string} CSS color value
 */
function getQuitColor(level) {
  return [RED_COLORS.empty, RED_COLORS.r1, RED_COLORS.r2, RED_COLORS.r3, RED_COLORS.r4][level];
}

export { COLORS, RED_COLORS, getColor, getQuitColor };
