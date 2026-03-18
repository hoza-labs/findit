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

- `npm run dev`: start a small local HTTP server that serves files from `src/`
- `npm run generate:placeholders`: regenerate the numbered placeholder images in `src/assets/placeholder-images`
- `npm run pad:deck-images`: scan standard deck images for pixels that would be clipped by the canvas renderer's circular mask, add transparent padding when needed, and update the standard-image manifest and alias map
- `npm run build`: generate `docs/` from `src/`
- `npm run clean`: remove generated files from `docs/`
- `npm test`: run unit tests
- `npm run test:watch`: rerun unit tests in watch mode while files change

## ImageMagick

`npm run pad:deck-images` uses the `canvas` package first. A separate ImageMagick install is only needed when that script has to decode formats that `canvas` cannot load directly in the current environment, especially `.webp` and `.avif` files.

- Installed version used for this project: `ImageMagick 7.1.2-16 Q16-HDRI x64`
- Install command used: `winget install -e --id ImageMagick.Q16-HDRI`
- Default executable lookup: `magick` on `PATH`
- Optional override: set `MAGICK_PATH` to the full executable path when `magick` is not on `PATH`
- Example Windows override: `MAGICK_PATH=C:\Users\bradh\AppData\Local\Microsoft\WindowsApps\magick.exe`

Normal development and CI do not require ImageMagick. The current GitHub Actions workflow runs `npm test` and `npm run build`; it does not run `npm run pad:deck-images`.

## Development notes

- Keep JavaScript modular and focused by concern.
- Tests should validate only public module interfaces.
- Prefer minimal dependencies; current scaffold uses no build libraries.
