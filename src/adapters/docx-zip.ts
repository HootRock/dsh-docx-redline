import { createHash } from 'node:crypto'
import { unzipSync } from 'fflate'
import { XMLParser } from 'fast-xml-parser'
import {
  DocxError,
  assertDocxPartLimits,
  emptyDocxStructure,
  type DocxInspection,
  type DocxPart,
  type DocxStructure,
} from '../core/docx.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: false,
  allowBooleanAttributes: false,
})

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value]
}

function parseXml(text: string): unknown {
  try {
    return parser.parse(text)
  } catch {
    throw new DocxError('E_DOC_UNREADABLE', 'part XML is not parseable')
  }
}

function countKey(value: unknown, key: string, count = 0): number {
  if (Array.isArray(value)) {
    for (const item of value) count = countKey(item, key, count)
    return count
  }
  const object = asObject(value)
  if (!object) return count
  for (const [name, child] of Object.entries(object)) {
    if (name === key) count += asArray(child).length
    count = countKey(child, key, count)
  }
  return count
}

function partCount(parts: Map<string, Uint8Array>, pattern: RegExp): number {
  let count = 0
  for (const name of parts.keys()) if (pattern.test(name)) count += 1
  return count
}

function inspectDocumentXml(xml: string, structure: DocxStructure, warnings: string[]): void {
  const root = parseXml(xml)
  const document = asObject(asObject(root)?.document)
  if (!document || !asObject(document.body)) {
    throw new DocxError('E_DOC_UNREADABLE', 'document.xml has no w:document/w:body')
  }
  structure.paragraphs = countKey(root, 'p')
  structure.tables = countKey(root, 'tbl')
  structure.table_rows = countKey(root, 'tr')
  structure.table_cells = countKey(root, 'tc')
  structure.bookmarks = countKey(root, 'bookmarkStart')
  structure.fields = countKey(root, 'fldSimple') + countKey(root, 'instrText')
  structure.numbered_paragraphs = countKey(root, 'numPr')
  structure.sections = countKey(root, 'sectPr')
  if (structure.paragraphs === 0 && structure.tables === 0) warnings.push('document has no paragraphs or tables')
}

function inspectStyles(xml: string | undefined, structure: DocxStructure, warnings: string[]): void {
  if (!xml) {
    warnings.push('styles.xml is missing')
    return
  }
  structure.styles = countKey(parseXml(xml), 'style')
  if (structure.styles === 0) warnings.push('styles.xml has no w:style')
}

function inspectComments(xml: string | undefined, structure: DocxStructure): void {
  if (!xml) return
  structure.comments = countKey(parseXml(xml), 'comment')
}

function inspectFootnotes(xml: string | undefined, structure: DocxStructure): void {
  if (!xml) return
  structure.footnotes = countKey(parseXml(xml), 'footnote')
}

export function inspectDocx(buffer: Buffer): DocxInspection {
  if (buffer.length === 0) throw new DocxError('E_DOC_FILE_UNREADABLE', 'empty file')
  let raw: Record<string, Uint8Array>
  try {
    raw = unzipSync(buffer)
  } catch {
    throw new DocxError('E_DOC_UNREADABLE', 'not a readable DOCX/ZIP')
  }
  const entries = Object.entries(raw).filter(([name]) => !name.endsWith('/'))
  assertDocxPartLimits(entries.map(([name, bytes]) => ({ name, size: bytes.length })))
  const parts = new Map(entries)
  if (!parts.has('[Content_Types].xml')) throw new DocxError('E_DOC_UNREADABLE', 'missing [Content_Types].xml')
  if (!parts.has('word/document.xml')) throw new DocxError('E_DOC_UNREADABLE', 'missing word/document.xml')

  const warnings: string[] = []
  const structure = emptyDocxStructure()
  const documentXml = Buffer.from(parts.get('word/document.xml')!).toString('utf8')
  inspectDocumentXml(documentXml, structure, warnings)
  inspectStyles(parts.has('word/styles.xml') ? Buffer.from(parts.get('word/styles.xml')!).toString('utf8') : undefined, structure, warnings)
  inspectComments(parts.has('word/comments.xml') ? Buffer.from(parts.get('word/comments.xml')!).toString('utf8') : undefined, structure)
  inspectFootnotes(parts.has('word/footnotes.xml') ? Buffer.from(parts.get('word/footnotes.xml')!).toString('utf8') : undefined, structure)
  structure.headers = partCount(parts, /^word\/header\d*\.xml$/)
  structure.footers = partCount(parts, /^word\/footer\d*\.xml$/)
  if (structure.headers === 0) warnings.push('no header part')
  if (structure.footers === 0) warnings.push('no footer part')
  if (structure.fields === 0) warnings.push('no field instructions detected')
  if (structure.bookmarks === 0) warnings.push('no bookmarks detected')
  if (structure.numbered_paragraphs === 0) warnings.push('no numbering properties detected')
  if (structure.comments === 0) warnings.push('no comments part/comments')

  const partList: DocxPart[] = entries
    .map(([name, bytes]) => ({ name, size: bytes.length, sha256: sha256(bytes) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { parts: partList, structure, warnings }
}

export function docxContentHash(buffer: Buffer): string {
  return sha256(buffer)
}

export function docxPartHashes(buffer: Buffer): Map<string, string> {
  const raw = unzipSync(buffer)
  return new Map(Object.entries(raw).filter(([name]) => !name.endsWith('/')).map(([name, bytes]) => [name, sha256(bytes)]))
}
