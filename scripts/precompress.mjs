// Writes .br and .gz siblings for text assets in dist/ so server.mjs can serve them directly.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync, constants } from 'node:zlib'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const exts = /\.(html|js|css|svg|json|txt|xml|map)$/

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

let saved = 0
for await (const file of walk(root)) {
  if (!exts.test(file)) continue
  const { size } = await stat(file)
  if (size < 1024) continue
  const buf = await readFile(file)
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: size } })
  const gz = gzipSync(buf, { level: 9 })
  if (br.length < size) await writeFile(`${file}.br`, br)
  if (gz.length < size) await writeFile(`${file}.gz`, gz)
  saved += size - br.length
}
console.log(`precompress: brotli saves ${(saved / 1024).toFixed(0)} KB`)
