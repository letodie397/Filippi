import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const churchesPath = join(root, 'src', 'data', 'maranata-churches.generated.json')
const cachePath = join(root, 'data', 'maranata-coordinates.cache.json')
const locationsPath = join(root, 'src', 'data', 'es-locations.generated.json')

const DELAY_MS = 1100
const onlyMissing = process.argv.includes('--missing')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function cleanLogradouro(logradouro) {
  return String(logradouro ?? '')
    .replace(/,+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/,(\S)/g, ', $1')
    .replace(/S\/Nº?/gi, 's/n')
    .trim()
    .replace(/^,\s*|,\s*$/g, '')
}

function buildBairroFallback() {
  if (!existsSync(locationsPath)) return new Map()
  const locations = JSON.parse(readFileSync(locationsPath, 'utf8'))
  const map = new Map()
  for (const b of locations.bairros) {
    if (b.lat == null || b.lng == null) continue
    map.set(`${normalize(b.cidade)}|${normalize(b.nome)}`, { lat: b.lat, lng: b.lng })
  }
  return map
}

function buildCityCentroids() {
  if (!existsSync(locationsPath)) return new Map()
  const locations = JSON.parse(readFileSync(locationsPath, 'utf8'))
  const map = new Map()
  for (const [cidade, data] of Object.entries(locations.centroidesCidade ?? {})) {
    if (data?.lat != null) map.set(normalize(cidade), { lat: data.lat, lng: data.lng })
  }
  return map
}

async function nominatimSearch(q) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
  const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0 (geocode-maranata)' } })
  const text = await res.text()
  if (!text.startsWith('[')) return null
  const data = JSON.parse(text)
  if (!data[0]) return null
  return { lat: +data[0].lat, lng: +data[0].lon, source: 'nominatim_endereco' }
}

async function geocodeChurch(ig, bairroFallback, cityCentroids) {
  const logradouro = cleanLogradouro(ig.logradouro)
  const bairro = ig.bairroMaranata || ig.bairro
  const cidade = ig.cidade

  const queries = []
  if (logradouro.length > 3) {
    queries.push(`${logradouro}, ${bairro}, ${cidade}, Espírito Santo, Brasil`)
    queries.push(`${logradouro}, ${cidade}, Espírito Santo, Brasil`)
  }
  queries.push(`${bairro}, ${cidade}, Espírito Santo, Brasil`)
  queries.push(`Igreja Cristã Maranata, ${bairro}, ${cidade}, Espírito Santo, Brasil`)

  for (let i = 0; i < queries.length; i++) {
    const hit = await nominatimSearch(queries[i])
    if (hit) return { ...hit, query: queries[i] }
    if (i < queries.length - 1) await sleep(DELAY_MS)
  }

  const fb = bairroFallback.get(`${normalize(cidade)}|${normalize(ig.bairro)}`)
  if (fb) return { ...fb, source: 'bairro_mapa' }

  const city = cityCentroids.get(normalize(cidade))
  if (city) return { ...city, source: 'centroide_cidade' }

  return null
}

if (!existsSync(churchesPath)) {
  console.error('Arquivo não encontrado. Rode: npm run build:maranata')
  process.exit(1)
}

const maranata = JSON.parse(readFileSync(churchesPath, 'utf8'))
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const bairroFallback = buildBairroFallback()
const cityCentroids = buildCityCentroids()

const list = onlyMissing
  ? maranata.igrejas.filter((ig) => !cache[ig.codigo]?.lat)
  : maranata.igrejas

console.log(`Geocodificando ${list.length} igrejas ICM (${onlyMissing ? 'só faltantes' : 'todas'})...\n`)

let ok = 0
let fallback = 0
let centroid = 0
let fail = 0

for (let i = 0; i < list.length; i++) {
  const ig = list[i]
  if (onlyMissing && cache[ig.codigo]?.lat) continue

  process.stdout.write(`[${i + 1}/${list.length}] ${ig.codigo} ${ig.nome}, ${ig.cidade}... `)

  const coords = await geocodeChurch(ig, bairroFallback, cityCentroids)
  if (coords) {
    cache[ig.codigo] = {
      lat: coords.lat,
      lng: coords.lng,
      source: coords.source,
      geocodedAt: new Date().toISOString(),
    }
    if (coords.source === 'bairro_mapa') fallback++
    else if (coords.source === 'centroide_cidade') centroid++
    else ok++
    console.log(`${coords.source} (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`)
  } else {
    fail++
    console.log('FALHOU')
  }

  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  await sleep(DELAY_MS)
}

console.log(`\nNominatim/endereço: ${ok} | Fallback bairro: ${fallback} | Centroide cidade: ${centroid} | Falhas: ${fail}`)
console.log(`Cache: ${Object.keys(cache).length}/${maranata.total} igrejas`)

console.log('\nReconstruindo maranata-churches.generated.json...')
const rebuild = spawnSync('node', ['scripts/build-maranata.mjs'], { cwd: root, stdio: 'inherit', shell: true })
process.exit(rebuild.status ?? 1)
