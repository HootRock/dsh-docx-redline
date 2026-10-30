# Fixtures — SKU-01 S1

- Valid synthetic DOCX: 20 in `scripts/acceptance.mjs` (3–6 paragraphs, optional table, numbering/field/bookmark, header/footer, footnote, comment, styles).
- Malformed: empty, non-ZIP, missing `[Content_Types].xml`, missing `word/document.xml`, non-DOCX `document.xml`.
- No real customer DOCX, no PII, no `fixtures/input` commit.
- `doc.roundtrip` writes copies only to a temp/`DSH_DOCX_HOME` directory.
