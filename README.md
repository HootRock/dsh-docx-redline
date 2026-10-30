# @perrylink/dsh-docx-redline

DOCX structure inspection and no-change roundtrip for DeepSeek Harness — **SKU-01 S1 public/synthetic demo**.

> **Status: partial / not GA.** The customer gate (20 real double-version DOCX pairs + 5 malformed) is **0/0**. The user explicitly approved the public/synthetic demo path on 2026-10-31. No customer document is included.

## Install

```sh
dsh plugin --profile <profile> add @perrylink/dsh-docx-redline
dsh --profile <profile> --dump-config | grep dsh-docx-redline
```

No Client, Skill or Bundle in S1.

## Tools

| Tool | What it does | Risk |
|---|---|---|
| `doc.inspect` | Read a local `.docx` ZIP/XML; store the original; report part SHA-256 and structure counts (paragraphs, tables, headers/footers, footnotes, comments, fields, bookmarks, numbering, sections, styles) | R0 read + local store |
| `doc.roundtrip` | Copy the original byte-for-byte and compare every part hash; returns a zero-diff report | R1 local write |

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `DSH_DOCX_HOME` | `$DSH_HOME/storages/dsh-docx-redline` | originals and roundtrip output |
| `DSH_DOCX_INPUT_ROOTS` | current working directory | `path.delimiter`-separated allowlist for input paths |

## Limits

- S1 does not diff, accept/reject revisions, write OOXML, render, or use Word/LibreOffice.
- No Client UI, no Skill, no Bundle, no MCP.
- Only `.docx` ZIP packages; encrypted/macro-only documents fail closed.
- Synthetic fixtures only; no real customer pair.

## Errors

`E_DOC_FILE_UNREADABLE`, `E_DOC_PATH_NOT_ALLOWED`, `E_DOC_ZIP_LIMIT`, `E_DOC_UNREADABLE`, `E_DOC_DOC_NOT_FOUND`, `E_DOC_ROUNDTRIP_FAILED`.

## Development

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm gate:sku01
```

## License

Apache-2.0. See `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES`.
