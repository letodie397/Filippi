import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const generatedPath = join(root, 'src', 'data', 'es-locations.generated.json')
const cachePath = join(root, 'data', 'es-coordinates.cache.json')
const manualPath = join(root, 'data', 'manual-coordinates.json')

if (!existsSync(generatedPath)) {
  console.error('Rode npm run build:locations primeiro')
  process.exit(1)
}

const generated = JSON.parse(readFileSync(generatedPath, 'utf8'))
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const allCoords = { ...cache, ...manual }

const missing = generated.bairros.filter((b) => !allCoords[`${b.cidade}|${b.nome}`])
console.log(`Faltam: ${missing.length}`)
for (const b of missing) {
  console.log(`${b.cidade}|${b.nome}`)
}
