# PUBLISH-STATUS — @perrylink/dsh-docx-redline

## 0.1.0-alpha.0 — submitted 2026-10-31T06:48+08:00

- `npm publish --access public --tag next --registry=https://registry.npmjs.org/` → exit 0; tarball shasum `a6121063c7d351b959a5702faf1d8812514c46d6`.
- Registry root was 404 immediately after publish; first-package processing/placeholder propagation. Re-check before announcing.
- No unpublish/deprecate.

### Update 2026-10-31T06:50+08:00

- `dist-tags`: `{ latest: "0.1.0-alpha.0", next: "0.1.0-alpha.0" }`; exact version metadata is public and `npm view` succeeds.
- Direct registry tarball install into a temp DSH profile passed:
  `dsh plugin add https://registry.npmjs.org/@perrylink/dsh-docx-redline/-/dsh-docx-redline-0.1.0-alpha.0.tgz` → layer `# == @perrylink/dsh-docx-redline`.
- pnpm's **metadata endpoint** briefly returned 404 immediately after publish (cache/mirror propagation), while the direct registry metadata was 200; use the exact version or tarball URL until the mirror catches up.
- `latest` is alpha because this is the first/only version; not GA.
