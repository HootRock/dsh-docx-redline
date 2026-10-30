# BUILD-LOG — @perrylink/dsh-docx-redline

## 2026-10-31 — S1 / 0.1.0-alpha.0

- Gate: 0 real DOCX pairs / 0 malformed; user-approved public/synthetic demo; `partial`, `not counted`.
- Tools: `doc.inspect`, `doc.roundtrip`; one `docx` domain/table; 5 source + config files.
- `pnpm test` 4/4; `gate:sku01` 3 rows (roundtrip 20/20, structure 6/6, malformed 5/5).
- Name audit: `@perrylink/dsh-docx-redline` and bare `dsh-docx-redline` both npm 404; similar packages exist (`@ansonlai/docx-redline-js`, `docxodus`, `jubarte-redlines`), different scope/API.
- Publish: pending.
