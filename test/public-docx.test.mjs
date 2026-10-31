import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { inspectDocx, docxPartHashes } from '../lib/adapters/docx-zip.js'

const dir = path.resolve(process.cwd(), 'fixtures/public/python-docx')
const files = readdirSync(dir).filter((name) => name.endsWith('.docx')).sort()

for (const name of files) {
  test(`public MIT DOCX: ${name}`, () => {
    const buffer = readFileSync(path.join(dir, name))
    const result = inspectDocx(buffer)
    assert.ok(result.parts.length > 0)
    assert.ok(result.structure.paragraphs + result.structure.tables > 0)
    assert.deepEqual(docxPartHashes(buffer), docxPartHashes(buffer))
  })
}
