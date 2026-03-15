// Storage key for legacy localStorage data
const STORAGE_KEY = "habit-grid-data";

// Emoji picker options for habit creation/edit
const EMOJI_OPTIONS = [
  "🎯", "💪", "📖", "🧘", "💻", "🏃",
  "✍️", "🎨", "🎵", "🧠", "💧", "🥗",
  "😴", "📝", "🔥", "⚡", "🌱", "🏋️",
];

// Day labels for grid rows (Monday-first ISO week)
const DAYS_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Month abbreviations in Spanish
const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// Predefined measurement units (seeded into DB on first run)
// Each entry: { name, abbreviation, is_predefined }
const DEFAULT_UNITS = [
  { name: "Veces", abbreviation: "vec", is_predefined: 1 },
  { name: "Minutos", abbreviation: "min", is_predefined: 1 },
  { name: "Horas", abbreviation: "hs", is_predefined: 1 },
  { name: "Páginas", abbreviation: "pág", is_predefined: 1 },
  { name: "Kilómetros", abbreviation: "km", is_predefined: 1 },
  { name: "Litros", abbreviation: "lt", is_predefined: 1 },
  { name: "Repeticiones", abbreviation: "rep", is_predefined: 1 },
];

export { STORAGE_KEY, EMOJI_OPTIONS, DAYS_LABELS, MONTHS, DEFAULT_UNITS };
