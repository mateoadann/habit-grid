# AGENTS.md — Coding Agent Guidelines for habit-grid

## Project Overview

Single-page React 18 habit tracker with a GitHub-style contribution grid.
Built with Vite 6, plain JavaScript (JSX — no TypeScript), zero backend (localStorage only).
UI language is Spanish (Rioplatense dialect). Two production dependencies: `react` and `react-dom`.

## Commands

```bash
# Install
npm install

# Development
npm run dev          # Start Vite dev server

# Build
npm run build        # Production build (vite build)
npm run preview      # Preview production build

# Lint / Format
# NONE configured — no ESLint, Prettier, or Biome

# Type checking
# NONE — no TypeScript, no jsconfig.json

# Tests
# NONE — no test runner, no test files exist
# If tests are added, prefer Vitest (already using Vite):
#   npx vitest run                     # Run all tests
#   npx vitest run src/App.test.jsx    # Run single test file
#   npx vitest run -t "test name"      # Run single test by name
```

## Architecture

```
habit-grid/
├── index.html            # Vite entry (lang="es")
├── package.json
├── vite.config.js        # Minimal — only @vitejs/plugin-react
├── src/
│   ├── main.jsx          # Entry point (9 lines, StrictMode wrapper)
│   └── App.jsx           # ENTIRE app (~643 lines, all components + utils + styles)
└── public/               # Static assets (currently empty)
```

**Current state**: Monolithic single-file app. All components, utilities, constants,
and inline styles live in `App.jsx`. No routing, no state management library,
no CSS framework.

### Component Tree

```
HabitTracker (root — all state lives here, default export)
├── HabitCard (per habit — receives props)
│   ├── ContributionGrid (SVG heatmap)
│   └── Stat (display metric)
├── HabitModal (create/edit form)
└── ConfirmModal (delete confirmation)
```

### Data Model

```javascript
// localStorage key: "habit-grid-data"
// Shape: { habits: Habit[], contributions: Contributions }

Habit = {
  id: string,           // "habit_" + Date.now()
  name: string,
  emoji: string,
  description: string,
  createdAt: string      // ISO date
}

Contributions = {
  [habitId]: {
    [dateKey]: number    // dateKey = "YYYY-MM-DD", value = count
  }
}
```

## Code Style

### Language & Module System

- **Plain JavaScript** with JSX — no TypeScript
- **ES Modules** (`"type": "module"` in package.json)
- File extensions: `.jsx` for all React files

### Naming Conventions

| Element             | Convention       | Example                          |
|---------------------|------------------|----------------------------------|
| Components          | PascalCase       | `ContributionGrid`, `HabitCard`  |
| Files (components)  | PascalCase.jsx   | `App.jsx`                        |
| Files (entry)       | camelCase.jsx    | `main.jsx`                       |
| Utility functions   | camelCase        | `getDateKey`, `getDaysInRange`   |
| Constants           | UPPER_SNAKE_CASE | `STORAGE_KEY`, `COLORS`          |
| State variables     | camelCase        | `showModal`, `editingHabit`      |
| Event handlers      | handleVerb       | `handleSaveHabit`, `handleLog`   |
| Callback props      | onVerb           | `onToggle`, `onSave`, `onClose`  |
| Style objects        | camelCase        | `smallBtn`, `actionBtn`          |

### Component Patterns

- **Function declarations** for components (not arrow functions):
  ```jsx
  function ContributionGrid({ habit, contributions, onToggle }) { ... }
  ```
- **Arrow functions** for handlers inside components:
  ```jsx
  const handleSaveHabit = (habit) => { ... };
  ```
- **Props destructured** in function signature — no `props.x` access
- **Default export** for the root component; internal components are not exported
- **No prop-types or TypeScript types** — duck typing throughout

### Styling

- **All inline styles** via `style={{}}` — no CSS files, no CSS modules, no Tailwind
- **Reusable style objects** defined as module-level constants:
  ```jsx
  const smallBtn = { padding: "4px 12px", borderRadius: 6, ... };
  ```
- **Conditional styles** via ternary operators in JSX
- **External fonts**: JetBrains Mono + DM Sans loaded from Google Fonts CDN

### State Management

- **useState + useEffect only** — no Context, no Redux, no Zustand
- **useRef** for initialization guard pattern (`initialized.current`)
- **State lifted** to root `HabitTracker` component, passed down as props
- **localStorage** as persistence layer with `loadFromStorage` / `saveToStorage` helpers

### Error Handling

- `try/catch` around all localStorage operations
- `console.error` for failures, return safe defaults (empty state)
- Silent failure on save errors — no user-facing error messages

### Formatting (Observed — No Enforced Config)

- **Semicolons**: yes
- **Quotes**: double quotes in App.jsx, single quotes in main.jsx (inconsistent)
- **Trailing commas**: present in some places
- **Indentation**: 2 spaces
- **No enforced formatter** — maintain consistency with surrounding code

### Imports

- External packages first, then internal modules
- Named imports from React:
  ```jsx
  import { useState, useEffect, useRef } from "react";
  ```
- Use double quotes for import paths (match App.jsx convention)

## Key Technical Details

- **SVG-based** contribution grid (not canvas, not HTML table)
- **Date handling**: manual date arithmetic, `getDateKey()` produces `YYYY-MM-DD`
- **ID generation**: `"habit_" + Date.now()` — not UUID
- **Hover effects**: direct DOM manipulation via `onMouseEnter`/`onMouseLeave` on event target
- **No API calls** — pure client-side application
- **React StrictMode** enabled in `main.jsx`
- Vite config uses `@vitejs/plugin-react` (Babel-based Fast Refresh)

## When Adding New Code

1. **Match existing patterns** — this is a small app; consistency matters more than "best practices"
2. **Keep inline styles** unless a CSS solution is explicitly adopted
3. **If extracting components** from App.jsx, use PascalCase filenames under `src/`
4. **New handlers**: `handleVerbNoun` pattern. New callback props: `onVerbNoun` pattern
5. **Persist state changes** through the existing `saveToStorage` helper
6. **UI text must be in Spanish** (Rioplatense: "Creá", "Editá", "Eliminá", not "Crea", "Edita")
7. **No TypeScript** unless explicitly migrating — don't mix .js and .ts files
8. **If adding tests**, use Vitest (compatible with existing Vite setup)
