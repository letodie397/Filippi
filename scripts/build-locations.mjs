import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const cities = require('brazilian-geographic-data/data/cities.json')

const ESTADO = 'ES'

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function generateAliases(name, city) {
  const aliases = new Set()

  const withoutNumber = name.replace(/\s+(?:n[º°.]?\s*)?(\d+|[IVXLCDM]+)$/i, '').trim()
  if (withoutNumber !== name && withoutNumber.length > 2) {
    aliases.add(withoutNumber)
  }

  const centroDe = name.match(/^Centro de (.+)$/i)
  if (centroDe) aliases.add('Centro')

  const deCity = name.match(new RegExp(`^(.+?) de ${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'))
  if (deCity && deCity[1].length > 2) aliases.add(deCity[1].trim())

  const praiaDe = name.match(/^Praia (?:do |da |de )?(.+)$/i)
  if (praiaDe && praiaDe[1].length > 2) aliases.add(praiaDe[1].trim())

  const firstWord = name.split(/\s+/)[0]
  if (firstWord && firstWord.length >= 4 && name.includes(' ')) {
    aliases.add(firstWord)
  }

  aliases.delete(name)
  return Array.from(aliases)
}

const esCities = cities
  .filter((c) => c.state === ESTADO)
  .map((c) => c.name)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))

const cachePath = join(__dirname, '..', 'data', 'es-coordinates.cache.json')
const manualPath = join(__dirname, '..', 'data', 'manual-coordinates.json')
const coordCache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manualCoords = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const allCoords = { ...coordCache, ...manualCoords }

const esNeighborhoods = neighborhoods
  .filter((n) => n.state === ESTADO)
  .map((n) => {
    const aliases = generateAliases(n.name, n.city)
    const entry = { nome: n.name, cidade: n.city }
    if (aliases.length > 0) entry.aliases = aliases
    const coords = allCoords[`${n.city}|${n.name}`]
    if (coords?.lat && coords?.lng) {
      entry.lat = coords.lat
      entry.lng = coords.lng
    }
    if (coords?.aliases?.length) {
      entry.aliases = [...new Set([...(entry.aliases ?? []), ...coords.aliases])]
    }
    return entry
  })
  .sort((a, b) => {
    const cityCmp = a.cidade.localeCompare(b.cidade, 'pt-BR')
    return cityCmp !== 0 ? cityCmp : a.nome.localeCompare(b.nome, 'pt-BR')
  })

const withCoords = esNeighborhoods.filter((b) => b.lat && b.lng)

const centroidsPath = join(__dirname, '..', 'data', 'city-centroids.json')
const cityCentroids = existsSync(centroidsPath)
  ? JSON.parse(readFileSync(centroidsPath, 'utf8'))
  : {}

for (const city of esCities) {
  if (cityCentroids[city]) continue
  const cityBairros = esNeighborhoods.filter((b) => b.cidade === city && b.lat && b.lng)
  if (cityBairros.length > 0) {
    const lat = cityBairros.reduce((s, b) => s + b.lat, 0) / cityBairros.length
    const lng = cityBairros.reduce((s, b) => s + b.lng, 0) / cityBairros.length
    cityCentroids[city] = { lat, lng, source: 'media_bairros', count: cityBairros.length }
  }
}

const output = {
  estado: 'Espírito Santo',
  uf: ESTADO,
  fonte: 'IBGE via brazilian-geographic-data',
  geradoEm: new Date().toISOString(),
  totalCidades: esCities.length,
  totalBairros: esNeighborhoods.length,
  totalComGps: withCoords.length,
  totalCentroidesCidade: Object.keys(cityCentroids).length,
  cidades: esCities,
  bairros: esNeighborhoods,
  centroidesCidade: cityCentroids,
}

const outPath = join(__dirname, '..', 'src', 'data', 'es-locations.generated.json')
writeFileSync(outPath, JSON.stringify(output))

console.log(`Gerado: ${outPath}`)
console.log(`  ${esCities.length} cidades`)
console.log(`  ${esNeighborhoods.length} bairros`)

const vv = esNeighborhoods.filter((b) => b.cidade === 'Vila Velha')
const vvCoords = vv.filter((b) => b.lat && b.lng)
console.log(`  Vila Velha: ${vvCoords.length}/${vv.length} com GPS`)
console.log(`  Com coordenadas: ${withCoords.length}/${esNeighborhoods.length}`)
console.log(`  Centroides cidade: ${Object.keys(cityCentroids).length}/${esCities.length}`)
