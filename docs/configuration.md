# Configuration and errors

| Env | Default | Description |
|---|---|---|
| `DSH_DOCX_HOME` | `$DSH_HOME/storages/dsh-docx-redline` | base for `originals/` and `roundtrip/` |
| `DSH_DOCX_INPUT_ROOTS` | `process.cwd()` | input allowlist; symlink escapes are rejected |

| Code | Meaning |
|---|---|
| `E_DOC_FILE_UNREADABLE` | empty/unreadable file |
| `E_DOC_PATH_NOT_ALLOWED` | outside input roots |
| `E_DOC_ZIP_LIMIT` | ZIP-bomb guard before decompression: >1000 entries, >4MB/entry, >32MB total, or >100:1 compression for entries >1MB; the post-decompression cap is 5000 parts / 50MB per part / 100MB total |
| `E_DOC_UNREADABLE` | not a DOCX/ZIP, missing `[Content_Types].xml`/`word/document.xml`, or no `w:document/w:body` |
| `E_DOC_DOC_NOT_FOUND` | unknown `doc_id` |
| `E_DOC_ROUNDTRIP_FAILED` | part mismatch (not expected for a part-wise copy) |
