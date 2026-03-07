# FindIt (Spot It / Dobble Deck Builder)

Static website project scaffold for a browser-only app that:

- explains how Spot It (Dobble) works,
- lets users generate a custom deck,
- saves deck data in browser storage,
- supports exporting deck data and print-friendly output.

## Project layout

- `src/`: source files (HTML/CSS/JS/assets)
- `docs/`: generated static output for GitHub Pages
- `tests/`: BDD-style unit tests for module public interfaces
- `scripts/`: build/clean scripts
- `.github/workflows/`: CI build/test workflow

## Commands

- `npm test`: run unit tests
- `npm run build`: generate `docs/` from `src/`
- `npm run clean`: remove generated files from `docs/`

## Development notes

- Keep JavaScript modular and focused by concern.
- Tests should validate only public module interfaces.
- Prefer minimal dependencies; current scaffold uses no build libraries.
