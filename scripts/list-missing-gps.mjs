import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const esBairros = neighborhoods.filter((n) => n.state === 'ES')

const cachePath = join(root, 'data', 'es-coordinates.cache.json')
const manualPath = join(root, 'data', 'manual-coordinates.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const allCoords = { ...cache, ...manual }

const missing = esBairros.filter((b) => !allCoords[`${b.city}|${b.name}`])
console.log(`Faltam: ${missing.length}`)
for (const b of missing) {
  console.log(`${b.city}|${b.name}`)
}
