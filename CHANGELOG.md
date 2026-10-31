# Changelog

## 0.1.0-alpha.3 — 2026-10-31

- Added limited `doc.replace_text` exact-run OOXML write; fails unless exactly one match; comments/fields not rewritten.

## 0.1.0-alpha.2 — 2026-10-31

- Added `redline.diff` text-level paragraph diff; no OOXML writing or Word redline. Still partial/public-synthetic.

## 0.1.0-alpha.0 — 2026-10-31

- First S1 slice: `doc.inspect` and `doc.roundtrip`.
- DOCX ZIP/XML reader with six structure families; byte-for-byte no-change roundtrip.
- `docx` storage domain; public/synthetic acceptance (`not counted`, `partial`).

## 0.1.0-alpha.1 — 2026-10-31

- Added public MIT DOCX sample tests (python-docx) and GitHub Actions CI; no runtime API change.
