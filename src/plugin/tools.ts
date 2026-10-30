/** S1 model-facing tools: doc.inspect and doc.roundtrip. */

import { createHash } from 'node:crypto'
import { readFile, realpath, stat, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { DocxError, type DocxStructure } from '../core/docx.js'
import { docxPartHashes, inspectDocx } from '../adapters/docx-zip.js'
import {
  emptyDocxRecord,
  newDocId,
  sha256Buffer,
  storeOriginal,
  type DocxRecord,
  type DocxTable,
} from './storage.js'

export interface ToolDeps {
  table: DocxTable
  baseDir: string
  inputRoots: string[]
}

function text(value: string) {
  return [{ type: 'text' as const, text: value }]
}

function runIdOf(exec: unknown): string {
  const candidate = exec as { runId?: string; callId?: string }
  return candidate?.runId ?? candidate?.callId ?? 'run-unknown'
}

function actorOf(exec: unknown): string {
  const candidate = exec as { agent?: { id?: string }; actor?: string }
  return candidate?.agent?.id ?? candidate?.actor ?? 'agent'
}

async function resolveAllowedPath(inputPath: string, roots: string[]): Promise<string> {
  let resolved: string
  try {
    resolved = await realpath(path.resolve(inputPath))
  } catch {
    throw new DocxError('E_DOC_FILE_UNREADABLE', `cannot resolve: ${inputPath}`)
  }
  const resolvedRoots = await Promise.all(
    roots.map(async (root) => {
      try {
        return await realpath(path.resolve(root))
      } catch {
        return undefined
      }
    }),
  )
  const allowed = resolvedRoots.some((root) => root !== undefined && (resolved === root || resolved.startsWith(root + path.sep)))
  if (!allowed) throw new DocxError('E_DOC_PATH_NOT_ALLOWED', `path is outside configured roots: ${inputPath}`)
  return resolved
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(',')}}`
}

function structureOut() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      paragraphs: { type: 'number', required: true },
      tables: { type: 'number', required: true },
      table_rows: { type: 'number', required: true },
      table_cells: { type: 'number', required: true },
      headers: { type: 'number', required: true },
      footers: { type: 'number', required: true },
      footnotes: { type: 'number', required: true },
      comments: { type: 'number', required: true },
      fields: { type: 'number', required: true },
      bookmarks: { type: 'number', required: true },
      numbered_paragraphs: { type: 'number', required: true },
      sections: { type: 'number', required: true },
      styles: { type: 'number', required: true },
    },
  } as const
}

export function createTools(deps: ToolDeps) {
  const inspect = defineTool({
    name: 'doc.inspect',
    description: 'Inspect a local DOCX structure: parts and SHA-256, paragraphs, tables, headers/footers, footnotes, comments, fields, bookmarks, numbering, sections and styles. Read-only after storing the original locally.',
    parameters: {
      path: { type: 'string', required: true, description: 'Local .docx path under the configured input roots' },
      entity_id: { type: 'string', description: 'Optional logical entity; default "default"' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          doc_id: { type: 'string', required: true },
          sha256: { type: 'string', required: true },
          size: { type: 'number', required: true },
          existing: { type: 'boolean', required: true },
          parts_count: { type: 'number', required: true },
          structure: { ...structureOut(), required: true },
          warnings: { type: 'array', items: { type: 'string' }, required: true },
        },
      },
      render: (_args, value) =>
        text(`inspected ${value.doc_id} (${value.size} B): p=${value.structure.paragraphs} tbl=${value.structure.tables} hdr=${value.structure.headers} ftr=${value.structure.footers} fields=${value.structure.fields}`),
    },
    async execute(args, exec) {
      const resolved = await resolveAllowedPath(args.path, deps.inputRoots)
      const info = await stat(resolved)
      if (!info.isFile() || info.size === 0) throw new DocxError('E_DOC_FILE_UNREADABLE', 'not a non-empty file')
      const buffer = await readFile(resolved)
      const sha256 = sha256Buffer(buffer)
      for (const [, record] of deps.table.entries()) {
        if (record.source_sha256 === sha256) {
          return {
            doc_id: record.doc_id,
            sha256,
            size: record.source_size,
            existing: true,
            parts_count: record.parts.length,
            structure: record.structure,
            warnings: record.warnings,
          }
        }
      }
      const inspection = inspectDocx(buffer)
      const docId = newDocId()
      const storedPath = await storeOriginal(deps.baseDir, sha256, path.extname(resolved), buffer)
      const record = emptyDocxRecord({
        docId,
        entityId: args.entity_id?.trim() || 'default',
        sourceName: path.basename(resolved),
        sourcePath: storedPath,
        sha256,
        size: info.size,
        parts: inspection.parts,
        structure: inspection.structure,
        warnings: inspection.warnings,
        runId: runIdOf(exec),
        actor: actorOf(exec),
      })
      record.evidence_sha256 = createHash('sha256').update(canonicalJson({ parts: inspection.parts, structure: inspection.structure, warnings: inspection.warnings })).digest('hex')
      await deps.table.put(docId, record)
      return {
        doc_id: docId,
        sha256,
        size: info.size,
        existing: false,
        parts_count: inspection.parts.length,
        structure: inspection.structure,
        warnings: inspection.warnings,
      }
    },
  })

  const roundtrip = defineTool({
    name: 'doc.roundtrip',
    description: 'Copy an inspected DOCX byte-for-byte and compare all part hashes; returns a zero-diff report. Local R1 write; no XML/OOXML generation.',
    parameters: {
      doc_id: { type: 'string', required: true },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          doc_id: { type: 'string', required: true },
          input_sha256: { type: 'string', required: true },
          output_sha256: { type: 'string', required: true },
          zero_diff: { type: 'boolean', required: true },
          parts_compared: { type: 'number', required: true },
          missing_parts: { type: 'array', items: { type: 'string' }, required: true },
          hash_mismatch: { type: 'array', items: { type: 'string' }, required: true },
        },
      },
      render: (_args, value) => text(`roundtrip ${value.doc_id}: ${value.zero_diff ? 'zero-diff' : 'DIFF'} (${value.parts_compared} parts)`),
    },
    async execute(args) {
      const record = deps.table.get(args.doc_id)
      if (!record) throw new DocxError('E_DOC_DOC_NOT_FOUND', `unknown doc_id: ${args.doc_id}`)
      const buffer = await readFile(record.source_path)
      const inputSha = sha256Buffer(buffer)
      const outDir = path.join(deps.baseDir, 'roundtrip')
      await mkdir(outDir, { recursive: true })
      const outPath = path.join(outDir, `${record.doc_id}.docx`)
      await writeFile(outPath, buffer)
      const output = await readFile(outPath)
      const outputSha = sha256Buffer(output)
      const inputParts = docxPartHashes(buffer)
      const outputParts = docxPartHashes(output)
      const missingParts = [...inputParts.keys()].filter((name) => !outputParts.has(name))
      const hashMismatch = [...inputParts.entries()].filter(([name, hash]) => outputParts.get(name) !== hash).map(([name]) => name)
      const zeroDiff = inputSha === outputSha && missingParts.length === 0 && hashMismatch.length === 0
      const updated: DocxRecord = {
        ...record,
        lifecycle: zeroDiff ? 'roundtripped' : 'failed',
        roundtrip: {
          input_sha256: inputSha,
          output_sha256: outputSha,
          zero_diff: zeroDiff,
          parts_compared: inputParts.size,
          missing_parts: missingParts,
          hash_mismatch: hashMismatch,
          checked_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }
      await deps.table.put(record.doc_id, updated)
      return {
        doc_id: record.doc_id,
        input_sha256: inputSha,
        output_sha256: outputSha,
        zero_diff: zeroDiff,
        parts_compared: inputParts.size,
        missing_parts: missingParts,
        hash_mismatch: hashMismatch,
      }
    },
  })

  return [inspect, roundtrip]
}
