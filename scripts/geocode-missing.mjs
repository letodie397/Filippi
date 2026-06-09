import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const generatedPath = join(root, 'src', 'data', 'es-locations.generated.json')
if (!existsSync(generatedPath)) {
  console.error('Rode npm run build:locations primeiro')
  process.exit(1)
}
const generated = JSON.parse(readFileSync(generatedPath, 'utf8'))
const esBairros = generated.bairros.map((b) => ({ city: b.cidade, name: b.nome }))

const cachePath = join(root, 'data', 'es-coordinates.cache.json')
const manualPath = join(root, 'data', 'manual-coordinates.json')
const centroidsPath = join(root, 'data', 'city-centroids.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const centroids = existsSync(centroidsPath) ? JSON.parse(readFileSync(centroidsPath, 'utf8')) : {}
const allKnown = { ...cache, ...manual }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocode(bairro, cidade) {
  const queries = [
    `${bairro}, ${cidade}, Espírito Santo, Brasil`,
    `${bairro}, ${cidade}, ES, Brasil`,
    `${bairro}, ${cidade}, Brasil`,
  ]
  for (const q of queries) {
    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
    const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0 (icm-pedidos)' } })
    const text = await res.text()
    if (text.startsWith('[')) {
      const data = JSON.parse(text)
      if (data[0]) return { lat: +data[0].lat, lng: +data[0].lon, source: 'nominatim' }
    }
    await sleep(1200)
  }
  return null
}

const missing = esBairros.filter((b) => !allKnown[`${b.city}|${b.name}`])
console.log(`Geocodificando ${missing.length} bairros faltantes...\n`)

let ok = 0
let centroid = 0

for (let i = 0; i < missing.length; i++) {
  const b = missing[i]
  const key = `${b.city}|${b.name}`
  process.stdout.write(`[${i + 1}/${missing.length}] ${b.name}, ${b.city}... `)

  const coords = await geocode(b.name, b.city)
  if (coords) {
    cache[key] = { lat: coords.lat, lng: coords.lng, source: coords.source }
    ok++
    console.log('OK')
  } else if (centroids[b.city]) {
    cache[key] = {
      lat: centroids[b.city].lat,
      lng: centroids[b.city].lng,
      source: 'centroide_cidade',
    }
    centroid++
    console.log('centroide cidade')
  } else {
    console.log('FALHOU (sem centroide)')
  }

  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  await sleep(1200)
}

console.log(`\nNominatim: ${ok} | Centroide fallback: ${centroid}`)
console.log(`Total cache: ${Object.keys(cache).length}/772`)
