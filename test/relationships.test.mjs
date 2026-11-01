import test from 'node:test'
import assert from 'node:assert/strict'
import { relationshipCheck } from '../lib/adapters/docx-zip.js'
import { strToU8, zipSync } from 'fflate'

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const doc = (body) => `<?xml version="1.0"?><w:document ${NS}><w:body>${body}</w:body></w:document>`
const rels = (items) => `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`
const package_ = (documentXml, relsXml, extra = {}) => Buffer.from(zipSync({
  '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
  'word/document.xml': strToU8(documentXml),
  'word/_rels/document.xml.rels': strToU8(relsXml),
  ...extra,
}))

test('declared and present internal parts produce no issues', () => {
  const r = relationshipCheck(package_(
    doc('<w:p><w:hyperlink r:id="rId1"/></w:p>'),
    rels('<Relationship Id="rId1" Type="x" Target="header1.xml"/>'),
    { 'word/header1.xml': strToU8('<w:hdr/>') },
  ))
  assert.equal(r.relationships, 1)
  assert.equal(r.referenced, 1)
  assert.equal(r.external, 0)
  assert.deepEqual(r.issues, [])
})

test('an undeclared reference is reported', () => {
  const r = relationshipCheck(package_(doc('<w:p><w:hyperlink r:id="rId9"/></w:p>'), rels('')))
  assert.equal(r.issues.length, 1)
  assert.equal(r.issues[0].code, 'E_DOC_REL_UNRESOLVED')
})

test('a declared but missing target part is reported', () => {
  const r = relationshipCheck(package_(
    doc('<w:p><w:hyperlink r:id="rId1"/></w:p>'),
    rels('<Relationship Id="rId1" Type="x" Target="media/image1.png"/>'),
  ))
  assert.equal(r.issues[0].code, 'E_DOC_REL_MISSING_PART')
  assert.match(r.issues[0].detail, /word\/media\/image1\.png/)
})

test('external targets are counted, not treated as missing parts', () => {
  const r = relationshipCheck(package_(
    doc('<w:p><w:hyperlink r:id="rId2"/></w:p>'),
    rels('<Relationship Id="rId2" Type="x" Target="https://example.test/" TargetMode="External"/>'),
  ))
  assert.equal(r.external, 1)
  assert.deepEqual(r.issues, [])
})
