import { readFileSync } from 'node:fs'
const pack = JSON.parse(readFileSync('pack.json', 'utf8'))
const files = pack[0]?.files?.map((file) => file.path) ?? []
if (files.length === 0) throw new Error('pack.json has no files')
const required = ['package.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'NOTICE', 'lib/plugin/index.js']
for (const file of required) if (!files.includes(file)) throw new Error(`missing required: ${file}`)
for (const file of files) for (const pattern of [/^src\//, /^test\//, /^scripts\//, /^fixtures\//, /^evidence\//, /\.env/, /\.pem$/, /node_modules\//, /\.tgz$/]) if (pattern.test(file)) throw new Error(`forbidden: ${file}`)
console.log(`pack ok: ${files.length} files`)
