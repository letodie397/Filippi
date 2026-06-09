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
const supplementPath = join(__dirname, '..', 'data', 'cepbrasil-supplement.json')
const extraAliasesPath = join(__dirname, '..', 'data', 'cepbrasil-extra-aliases.json')
const coordCache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manualCoords = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const cepSupplement = existsSync(supplementPath) ? JSON.parse(readFileSync(supplementPath, 'utf8')) : []
const cepExtraAliases = existsSync(extraAliasesPath) ? JSON.parse(readFileSync(extraAliasesPath, 'utf8')) : {}
const allCoords = { ...coordCache, ...manualCoords }

function buildBairroEntry(nome, cidade, fonte = 'ibge') {
  const aliases = generateAliases(nome, cidade)
  const entry = { nome, cidade, fonte }
  if (aliases.length > 0) entry.aliases = aliases

  const extra = cepExtraAliases[`${cidade}|${nome}`]
  if (extra?.length) {
    entry.aliases = [...new Set([...(entry.aliases ?? []), ...extra])]
  }

  const coords = allCoords[`${cidade}|${nome}`]
  if (coords?.lat && coords?.lng) {
    entry.lat = coords.lat
    entry.lng = coords.lng
  }
  if (coords?.aliases?.length) {
    entry.aliases = [...new Set([...(entry.aliases ?? []), ...coords.aliases])]
  }
  return entry
}

const esNeighborhoods = neighborhoods
  .filter((n) => n.state === ESTADO)
  .map((n) => buildBairroEntry(n.name, n.city, 'ibge'))

const existingKeys = new Set(esNeighborhoods.map((b) => `${b.cidade}|${normalize(b.nome)}`))

for (const item of cepSupplement) {
  const key = `${item.cidade}|${normalize(item.nome)}`
  if (existingKeys.has(key)) continue
  esNeighborhoods.push(buildBairroEntry(item.nome, item.cidade, item.fonte ?? 'cepbrasil'))
  existingKeys.add(key)
}

esNeighborhoods.sort((a, b) => {
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

const ibgeCount = esNeighborhoods.filter((b) => b.fonte === 'ibge').length
const cepCount = esNeighborhoods.filter((b) => b.fonte === 'cepbrasil').length

const output = {
  estado: 'Espírito Santo',
  uf: ESTADO,
  fonte: 'IBGE + CEPBrasil',
  geradoEm: new Date().toISOString(),
  totalCidades: esCities.length,
  totalBairros: esNeighborhoods.length,
  totalBairrosIbge: ibgeCount,
  totalBairrosCepbrasil: cepCount,
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
console.log(`  ${esNeighborhoods.length} bairros (${ibgeCount} IBGE + ${cepCount} CEPBrasil)`)

const vv = esNeighborhoods.filter((b) => b.cidade === 'Vila Velha')
const vvCoords = vv.filter((b) => b.lat && b.lng)
console.log(`  Vila Velha: ${vvCoords.length}/${vv.length} com GPS`)
console.log(`  Com coordenadas: ${withCoords.length}/${esNeighborhoods.length}`)
console.log(`  Centroides cidade: ${Object.keys(cityCentroids).length}/${esCities.length}`)
