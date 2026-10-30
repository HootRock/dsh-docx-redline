# Architecture — SKU-01 S1

```text
core/docx.ts       error codes, limits, structure type
adapters/docx-zip.ts  fflate unzip + fast-xml-parser structure counts
plugin/storage.ts  docx domain (documents), originals, ULID
plugin/tools.ts    doc.inspect / doc.roundtrip
plugin/index.ts    DSH Host entry
```

Data flow: local `.docx` → path allowlist → ZIP limits → `[Content_Types].xml`/`word/document.xml` check → XML structure counts → local original → `documents` record; `doc.roundtrip` copies bytes and compares every part hash.

The reader is deliberately a whitelist: no macros, no external relationships, no XML entity expansion, no OOXML writing. The no-change roundtrip is a byte copy, so it cannot silently rewrite styles/numbering. S2 (diff/redline) and S3 (verify/ledger) are not part of this package.
