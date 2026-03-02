# JSON Variables Importer — Figma Plugin

A Figma plugin that parses pasted or uploaded JSON design tokens and imports them into Figma Variables. It auto-detects token types (COLOR, FLOAT, BOOLEAN) and ignores irrelevant fields like `oklch`, `description`, or `type`.

## Supported JSON Shapes

The plugin is tolerant of many JSON structures. If a node has a `value` key, that value is used and all sibling keys are ignored.

```json
{
  "colors": {
    "brand": {
      "600": {
        "value": "#C83072",
        "oklch": "oklch(50.0% 0.200 350)"
      }
    }
  }
}
```

Also supports:
- Primitive leaf values: `{ "radius": 8 }`
- Token objects: `{ "radius": { "value": 8 } }`
- Aliases: `{ "primary": { "value": "{colors.brand.600}" } }`
- Multi-mode: top-level keys like `light` / `dark`

## Supported Token Types

| Type    | Example value          |
|---------|------------------------|
| COLOR   | `#C83072`, `rgb(...)`, `hsl(...)` |
| FLOAT   | `8`, `1.5`, `0`        |
| BOOLEAN | `true`, `false`        |
| ALIAS   | `{colors.brand.600}`   |

> String tokens are intentionally skipped.

## Development

```bash
npm install
npm run dev      # watch mode (UI + plugin)
npm run build    # production build
npm test         # run unit tests
```

Build outputs to `dist/`:
- `dist/index.html` — inlined UI
- `dist/code.js` — Figma plugin main thread

## Project Structure

```
src/
  core/         # Parsing pipeline (no Figma deps)
    parser.ts   # JSON.parse with error info
    flattener.ts # Nested JSON → flat token paths
    detector.ts  # Infer token type from value
    normalizer.ts # Convert to Figma-compatible values
  plugin/       # Figma main thread
    code.ts
    figma-writer.ts
    reporter.ts
  ui/           # React UI
    App.tsx
  shared/
    types.ts
tests/          # Vitest unit tests
```

## Milestones

- [x] M1 — Project bootstrap
- [x] M2 — Core parsing pipeline
- [ ] M3 — Figma writer
- [ ] M4 — Full plugin UI
- [ ] M5 — Multi-mode support
- [ ] M6 — Settings persistence
- [ ] M7 — Robustness
- [ ] M8 — QA
- [ ] M9 — Release
