import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { Context } from '@deepseek-ai/cordis'
import { z } from 'zod'

const partSchema = z.object({
  name: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string(),
})

const structureSchema = z.object({
  paragraphs: z.number().int().nonnegative(),
  tables: z.number().int().nonnegative(),
  table_rows: z.number().int().nonnegative(),
  table_cells: z.number().int().nonnegative(),
  headers: z.number().int().nonnegative(),
  footers: z.number().int().nonnegative(),
  footnotes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  fields: z.number().int().nonnegative(),
  bookmarks: z.number().int().nonnegative(),
  numbered_paragraphs: z.number().int().nonnegative(),
  sections: z.number().int().nonnegative(),
  styles: z.number().int().nonnegative(),
})

const roundtripSchema = z.object({
  input_sha256: z.string(),
  output_sha256: z.string(),
  zero_diff: z.boolean(),
  parts_compared: z.number().int().nonnegative(),
  missing_parts: z.array(z.string()),
  extra_parts: z.array(z.string()).default([]),
  hash_mismatch: z.array(z.string()),
  checked_at: z.string(),
})

export const docxSchema = z.object({
  doc_id: z.string(),
  entity_id: z.string(),
  source_name: z.string(),
  source_path: z.string(),
  source_sha256: z.string(),
  source_size: z.number().int().nonnegative(),
  parts: z.array(partSchema),
  structure: structureSchema,
  warnings: z.array(z.string()),
  lifecycle: z.enum(['inspected', 'roundtripped', 'failed']),
  inspected_at: z.string(),
  roundtrip: roundtripSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
  run_id: z.string(),
  actor: z.string(),
  evidence_sha256: z.string(),
})

export type DocxRecord = z.infer<typeof docxSchema>
export type DocxTable = {
  get(key: string): DocxRecord | undefined
  entries(): IterableIterator<[string, DocxRecord]>
  keys(): IterableIterator<string>
  readonly size: number
  put(key: string, value: DocxRecord): Promise<void>
  delete(key: string): Promise<boolean>
}

export const docxSpec = defineDomain({
  name: 'docx',
  version: 1,
  tables: {
    documents: domainTable<string, DocxRecord>(docxSchema),
  },
})

export async function openDocxTable(ctx: Context): Promise<DocxTable> {
  const domain = await ctx.storageDomain.open(docxSpec)
  ctx.effect(() => () => domain.close(), 'dsh-docx-redline.domainClose')
  return domain.table('documents') as DocxTable
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function newDocId(): string {
  let time = Date.now()
  let prefix = ''
  for (let index = 0; index < 10; index += 1) {
    prefix = CROCKFORD[time % 32] + prefix
    time = Math.floor(time / 32)
  }
  const random = randomBytes(10)
  let suffix = ''
  for (const byte of random) suffix += CROCKFORD[byte % 32]
  return prefix + suffix
}

export function emptyDocxRecord(input: {
  docId: string
  entityId: string
  sourceName: string
  sourcePath: string
  sha256: string
  size: number
  parts: DocxRecord['parts']
  structure: DocxRecord['structure']
  warnings: string[]
  runId: string
  actor: string
}): DocxRecord {
  const now = new Date().toISOString()
  return {
    doc_id: input.docId,
    entity_id: input.entityId,
    source_name: input.sourceName,
    source_path: input.sourcePath,
    source_sha256: input.sha256,
    source_size: input.size,
    parts: input.parts,
    structure: input.structure,
    warnings: input.warnings,
    lifecycle: 'inspected',
    inspected_at: now,
    created_at: now,
    updated_at: now,
    run_id: input.runId,
    actor: input.actor,
    evidence_sha256: '',
  }
}

export async function storeOriginal(baseDir: string, sha256: string, ext: string, buffer: Buffer): Promise<string> {
  const directory = path.join(baseDir, 'originals')
  await mkdir(directory, { recursive: true })
  const filePath = path.join(directory, `${sha256}${ext || '.docx'}`)
  await writeFile(filePath, buffer)
  return filePath
}

export async function readOriginal(record: DocxRecord): Promise<Buffer> {
  return readFile(record.source_path)
}
