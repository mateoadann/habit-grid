// Grid color palette — GitHub-style contribution levels
const COLORS = {
  empty: "rgba(255,255,255,0.04)",
  l1: "#0e4429",
  l2: "#006d32",
  l3: "#26a641",
  l4: "#39d353",
};

/**
 * Returns the fill color for a given contribution level (0-4).
 * @param {number} level - 0 = empty, 1-4 = increasing intensity
 * @returns {string} CSS color value
 */
function getColor(level) {
  return [COLORS.empty, COLORS.l1, COLORS.l2, COLORS.l3, COLORS.l4][level];
}

export { COLORS, getColor };
