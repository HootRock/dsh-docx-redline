/** DSH Host entry for SKU-01 S1 (DOCX inspect + no-change roundtrip). */

import path from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { createTools } from './tools.js'
import { openDocxTable } from './storage.js'

export const name = 'dsh-docx-redline'
export const inject = ['tools', 'storageDomain']

export async function apply(ctx: Context): Promise<void> {
  const baseDir =
    process.env.DSH_DOCX_HOME ??
    path.join(process.env.DSH_HOME ?? process.cwd(), 'storages', 'dsh-docx-redline')
  const roots = (process.env.DSH_DOCX_INPUT_ROOTS ?? process.cwd())
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
  const table = await openDocxTable(ctx)
  for (const tool of createTools({ table, baseDir, inputRoots: roots })) {
    ctx.tools.register(tool)
  }
}
