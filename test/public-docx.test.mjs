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
    if (name.includes('table')) assert.ok(result.structure.tables >= 1)
    assert.deepEqual(docxPartHashes(buffer), docxPartHashes(buffer))
  })
}

test('redline.diff on two public MIT DOCX files', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { createTools } = await import('../lib/plugin/tools.js')
  class FakeTable {
    map = new Map()
    get(key) { return this.map.get(key) }
    entries() { return this.map.entries() }
    get size() { return this.map.size }
    async put(key, value) { this.map.set(key, value) }
  }
  const baseFile = path.join(dir, 'doc-default.docx')
  const targetFile = path.join(dir, 'comments-rich-para.docx')
  const work = await mkdtemp(path.join(tmpdir(), 'docx-public-diff-'))
  try {
    const tools = createTools({ table: new FakeTable(), baseDir: work, inputRoots: [dir] })
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
    const exec = { callId: 'public-diff', agent: { id: 'tester' } }
    const base = await byName['doc.inspect'].execute({ path: baseFile }, exec)
    const target = await byName['doc.inspect'].execute({ path: targetFile }, exec)
    const diff = await byName['redline.diff'].execute({ base_doc_id: base.doc_id, target_doc_id: target.doc_id }, exec)
    assert.ok(diff.added + diff.removed > 0)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
})
