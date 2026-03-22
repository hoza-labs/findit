# AGENTS Instructions

These instructions apply to all future work in this repository.

## Encoding Safety

Always add the following commands to your powershell profile:

```powershell
# Set default encoding to UTF-8 for all cmdlets that support -Encoding (e.g., Get-Content, Set-Content, Out-File)
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Set console input and output encoding to UTF-8 for compatibility with external programs
[Console]::InputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
```

## Purpose

Build and maintain a browser-only static website that explains Spot It (Dobble) and allows users to create, save, export, and print custom decks.

## Architecture

- Source of truth is `src/`.
- Generated site output is `docs/`.
- Build automation must continue to generate `docs/` from `src/`.
- Keep JavaScript modular:
  - one file per concern,
  - public interfaces explicit,
  - minimal coupling between modules.

## JavaScript conventions

- Use ES modules.
- Keep modules small and reusable across projects.
- Prefer pure functions for core rules/math logic.
- Keep DOM code isolated in app-level modules.
- Keep browser storage logic in dedicated storage modules.

## Testing (BDD style)

- Write tests in `tests/` using behavior-focused descriptions.
- Test only module public interfaces.
- Cover nominal behavior, validation, and edge cases.
- For browser-storage modules, inject a storage-like dependency for tests.

## Dependencies

- Prefer native browser/Node features first.
- Avoid heavy frameworks unless clearly justified.
- UI utility libraries (for example Bootstrap) are acceptable when they improve maintainability.

## Workflow and CI

- Keep `.github/workflows/static-site.yml` passing.
- CI should run tests and build.
- Do not commit generated artifacts outside `docs/`.

## Product constraints

- Browser-only runtime (no server requirement for core features).
- App should work for small multi-page navigation.
- Deck data must support browser storage.
- Users should be able to print locally and export card data to disk.

## UI Notes

- Any menu displayed with a top-nav menu, info menu, file menu, or three-dots/details menu should close when the user clicks elsewhere on the page or presses Escape. Escape should be absorbed when closing an open menu so it does not trigger unrelated page actions.
