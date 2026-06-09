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
const generatedPath = join(root, 'src', 'data', 'es-locations.generated.json')
const centroidsPath = join(root, 'data', 'city-centroids.json')

const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const allCoords = { ...cache, ...manual }
const centroids = existsSync(centroidsPath) ? JSON.parse(readFileSync(centroidsPath, 'utf8')) : {}

const byCity = {}
for (const b of esBairros) {
  if (!byCity[b.city]) byCity[b.city] = { total: 0, gps: 0, missing: [] }
  byCity[b.city].total++
  if (allCoords[`${b.city}|${b.name}`]) {
    byCity[b.city].gps++
  } else {
    byCity[b.city].missing.push(b.name)
  }
}

const totalGps = Object.values(allCoords).length
const citiesWithCentroid = Object.keys(centroids).length

console.log('=== Auditoria de Localidades ES ===\n')
console.log(`Bairros IBGE: ${esBairros.length}`)
console.log(`Com GPS direto: ${totalGps}`)
console.log(`Centroides cidade: ${citiesWithCentroid}/78`)
console.log(`Cobertura GPS bairro: ${((totalGps / esBairros.length) * 100).toFixed(1)}%\n`)

const lowCoverage = Object.entries(byCity)
  .map(([city, data]) => ({ city, ...data, pct: (data.gps / data.total) * 100 }))
  .filter((c) => c.pct < 50)
  .sort((a, b) => a.pct - b.pct)

if (lowCoverage.length > 0) {
  console.log('Cidades com menos de 50% dos bairros com GPS:')
  for (const c of lowCoverage) {
    const hasCentroid = centroids[c.city] ? 'sim' : 'NÃO'
    console.log(`  ${c.city}: ${c.gps}/${c.total} (${c.pct.toFixed(0)}%) — centroide: ${hasCentroid}`)
  }
  console.log('')
}

const vv = byCity['Vila Velha']
if (vv) {
  console.log(`Vila Velha: ${vv.gps}/${vv.total} bairros com GPS`)
  if (vv.missing.length > 0 && vv.missing.length <= 20) {
    console.log(`  Sem GPS: ${vv.missing.join(', ')}`)
  } else if (vv.missing.length > 20) {
    console.log(`  Sem GPS (${vv.missing.length}): ${vv.missing.slice(0, 10).join(', ')}...`)
  }
}

if (existsSync(generatedPath)) {
  const gen = JSON.parse(readFileSync(generatedPath, 'utf8'))
  console.log(`\nJSON gerado: ${gen.totalComGps ?? '?'} bairros GPS, ${gen.totalCentroidesCidade ?? '?'} centroides`)
}
