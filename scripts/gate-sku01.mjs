import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
try { execFileSync(process.execPath, ['scripts/acceptance.mjs'], { stdio: 'inherit' }) } catch { process.exit(1) }
const rows = readFileSync('ACCEPTANCE.csv', 'utf8').trim().split('\n').slice(1).map((line) => line.split(','))
if (rows.length === 0) { console.error('gate: no rows'); process.exit(2) }
for (const row of rows) {
  const [reqId, metric, threshold, actual, script, sha, pass] = row
  if (!reqId || !metric || !threshold || !actual || !script || !sha || pass !== 'true') {
    console.error(`gate: incomplete/failing row: ${row.join(',')}`)
    process.exit(1)
  }
}
console.log(`gate ok: ${rows.length} SKU-01 S1 rows (public/synthetic, not counted)`)
