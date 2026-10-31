# dsh-docx-redline

DOCX structure inspection, byte-exact roundtrip and limited exact-run text replace for DeepSeek Harness.

> **Status: alpha / public-synthetic / partial / not counted / not GA.** No customer evidence, customer data, or production-readiness claim. All acceptance rows are `counted=false`.

## Install

```sh
dsh plugin --profile <profile> add dsh-docx-redline
dsh --profile <profile> --dump-config | grep dsh-docx-redline
```

Requires DSH `>=0.2.1-rc.3 <0.3.0` and Node `>=24.9 <25`.

<details>
<summary>中文摘要</summary>

DOCX 结构检查、逐字节 roundtrip 与单 run 文本替换。 安装：`dsh plugin --profile <profile> add dsh-docx-redline`。公开/合成、alpha、非 GA。

</details>

## Tools

| Tool | What it does | Risk |
|---|---|---|
| `doc.inspect` | Read a local `.docx` ZIP/XML, store the original, and report part SHA-256 plus structure counts (paragraphs, tables, headers/footers, footnotes, comments, fields, bookmarks, numbering, sections, styles) | R0 read + local store |
| `doc.roundtrip` | Copy the original byte-for-byte and compare every part hash; return a zero-diff report | R1 local write |
| `doc.replace_text` | Replace one exact `w:t` run; fail closed when the text is not unique or spans runs | R1 local write |
| `redline.diff` | Text-level paragraph diff between two inspected DOCX files; no OOXML writing | R0 |

## Input / output

**Input:** local `.docx` ZIP packages. **Output:** a structure report (JSON), a byte-exact roundtrip report, a limited text-replaced copy, or a paragraph-level diff. Comments, headers/footers and fields are preserved by the replace path; they are not edited.

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `DSH_DOCX_HOME` | `$DSH_HOME/storages/dsh-docx-redline` | originals and roundtrip output |
| `DSH_DOCX_INPUT_ROOTS` | `current working directory` | `path.delimiter`-separated allowlist for input paths |

## Limits / non-claims

- No accept/reject revisions, no rendered redline, no Word/LibreOffice automation, and no general OOXML writing.
- `doc.replace_text` only replaces one exact `w:t` run; multi-run or repeated text fails closed.
- Only `.docx` ZIP packages; encrypted or macro-only documents fail closed.
- No Client, Skill, Bundle, or MCP surface.
- No customer evidence, customer data, or production-readiness claim; all fixtures are public/synthetic.

## Public sample

8 MIT DOCX samples from `python-docx`; structure/roundtrip/replace tests. No customer document is included.

## Development

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm gate:sku01
```

## License

Apache-2.0. See `LICENSE`, `NOTICE`, `THIRD-PARTY-NOTICES`.
