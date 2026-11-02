export type DocxLifecycle = 'inspected' | 'roundtripped' | 'failed'

export interface DocxPart {
  name: string
  size: number
  sha256: string
}

export interface DocxStructure {
  paragraphs: number
  tables: number
  table_rows: number
  table_cells: number
  headers: number
  footers: number
  footnotes: number
  comments: number
  fields: number
  bookmarks: number
  numbered_paragraphs: number
  sections: number
  styles: number
}

export interface DocxInspection {
  parts: DocxPart[]
  structure: DocxStructure
  warnings: string[]
}

export type DocxErrorCode =
  | 'E_DOC_PATH_NOT_ALLOWED'
  | 'E_DOC_FILE_UNREADABLE'
  | 'E_DOC_ZIP_LIMIT'
  | 'E_DOC_UNREADABLE'
  | 'E_DOC_DOC_NOT_FOUND'
  | 'E_DOC_ROUNDTRIP_FAILED'
  | 'E_DOC_WRITE_UNSUPPORTED'

export class DocxError extends Error {
  readonly code: DocxErrorCode
  readonly retryable: boolean
  readonly needsReview: boolean

  constructor(code: DocxErrorCode, message: string, options: { retryable?: boolean; needsReview?: boolean } = {}) {
    // User-facing format: "<human sentence>（E_DOC_…）｜下一步：<one action>".
    // Do not prefix the code twice when the message already carries it.
    super(message.includes(code) ? message : `${code}: ${message}`)
    this.name = 'DocxError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.needsReview = options.needsReview ?? false
  }
}

export const DOCX_PART_LIMIT = 5000
export const DOCX_UNCOMPRESSED_LIMIT = 100 * 1024 * 1024
export const DOCX_PART_SIZE_LIMIT = 50 * 1024 * 1024

/**
 * Pre-decompression guards applied by every DOCX read in the adapter.
 * They are deliberately stricter than the post-decompression assertions above:
 * a ZIP bomb must be rejected before fflate inflates a single oversized entry.
 */
export const DOCX_ZIP_ENTRY_LIMIT = 1000
export const DOCX_ZIP_ENTRY_SIZE_LIMIT = 4 * 1024 * 1024
export const DOCX_ZIP_TOTAL_SIZE_LIMIT = 32 * 1024 * 1024
export const DOCX_ZIP_RATIO_LIMIT = 100
export const DOCX_ZIP_RATIO_MIN_BYTES = 1 * 1024 * 1024

export function assertDocxPartLimits(parts: Array<{ name: string; size: number }>): void {
  if (parts.length > DOCX_PART_LIMIT) throw new DocxError('E_DOC_ZIP_LIMIT', `too many parts: ${parts.length}`)
  let total = 0
  for (const part of parts) {
    if (part.size > DOCX_PART_SIZE_LIMIT) throw new DocxError('E_DOC_ZIP_LIMIT', `part too large: ${part.name}`)
    total += part.size
  }
  if (total > DOCX_UNCOMPRESSED_LIMIT) throw new DocxError('E_DOC_ZIP_LIMIT', `uncompressed size ${total} exceeds limit`)
}

export function emptyDocxStructure(): DocxStructure {
  return {
    paragraphs: 0,
    tables: 0,
    table_rows: 0,
    table_cells: 0,
    headers: 0,
    footers: 0,
    footnotes: 0,
    comments: 0,
    fields: 0,
    bookmarks: 0,
    numbered_paragraphs: 0,
    sections: 0,
    styles: 0,
  }
}

export function describeDocxError(error: unknown): { code: string; message: string } {
  if (error instanceof DocxError) return { code: error.code, message: error.message }
  if (error instanceof Error) return { code: 'E_DOC_UNREADABLE', message: error.message }
  return { code: 'E_DOC_UNREADABLE', message: String(error) }
}
