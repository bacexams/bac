# Themes, Progress Bars, and JavaScript Architecture

This project uses one shared script (`exam-progress.js`) plus page-specific inline JavaScript (notably in `view-pdf.html`).

## 1) How themes work

- Theme state key: `bac.theme.choice` in `localStorage` (with cookie fallback).
- Allowed theme classes are centralized in `THEMES` and applied on `<body>`.
- At startup:
  1. The script injects a floating theme menu (`ensureThemeMenu`).
  2. Reads saved theme (`readThemeChoice`).
  3. Applies it (`applyTheme`) and syncs active swatch UI (`initGlobalTheme`).
- Clicking a swatch updates body class + persists the selected theme.
- A `storage` listener keeps multiple tabs in sync.

### CSS side of themes

- Global UI colors are CSS custom properties (`--bg-bottom`, `--surface`, `--accent`, etc.).
- Each `.theme-*` class overrides those variables, so all components recolor automatically without changing component-level CSS selectors.

## 2) How progress bars work

There are several progress surfaces, all backed by the same completion store:

- Store key: `bac.examProgress.v1` in `localStorage`.
- Storage format: object/map of normalized PDF paths to `true`.
- Paths are normalized by removing query/hash and normalizing slashes.

### A. Exam list page progress bar

On pages containing links like `view-pdf.html?pdf=...SujetYYYY.pdf`:

- Script inserts a progress block (`.exam-progress`) under the heading.
- It prepends a toggle button per exam row (`.exam-check-toggle`) to mark done/undone.
- `buildProgressData` computes `doneCount`, `total`, `percentage`.
- UI updates:
  - bar fill width (`.exam-progress-fill`) = `percentage%`
  - numeric label (`.exam-progress-value`) = `percentage%`
  - ARIA progress value updated for accessibility.

### B. Session badges on navigation links/buttons

For links/buttons that point to exam session pages:

- Script fetches target HTML, parses it with `DOMParser`, extracts subject PDF links, computes completion percentage, then displays a circular badge (`.session-progress-badge`).
- Badge rendering uses CSS `conic-gradient` driven by `--progress`.

### C. PDF viewer done state

On `view-pdf.html`:

- Script adds a small done-toggle button in `.pdf-toolbar-actions`.
- Toggling marks current PDF as done/undone in store.
- If the PDF is a `SujetYYYY.pdf`, matching `CorrYYYY.pdf` is automatically mirrored to same done state.

## 3) How JavaScript is implemented overall

### Shared behavior script

- `exam-progress.js` is loaded with `defer` in index/major pages.
- It is an IIFE (`(function(){ ... })();`) to avoid global namespace pollution.
- The script always calls these initializers at bottom:
  - theme menu + theme init
  - exam-list progress enhancement
  - session-link badges
  - PDF-page done button enhancement
  - button-level progress enhancement

### PDF rendering + study tools script

- `view-pdf.html` has an inline `<script type="module">` that imports `pdf.js` from CDN.
- That module handles:
  - reading `pdf` query parameter
  - loading and rendering PDF pages to canvas
  - zoom controls
  - navigation/back/home behavior
  - timer + ambiance controls in the side panel

## 4) Data flow summary

1. User picks theme -> class on `<body>` changes -> CSS variables update -> entire UI recolors.
2. User marks an exam done -> path saved in localStorage -> progress UI refreshes across relevant pages.
3. User navigates session cards/buttons -> badges are computed by parsing linked pages and evaluating stored completion.
