import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const cities = require('brazilian-geographic-data/data/cities.json').filter((c) => c.state === 'ES')

const cachePath = join(root, 'data', 'es-coordinates.cache.json')
const manualPath = join(root, 'data', 'manual-coordinates.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const manual = existsSync(manualPath) ? JSON.parse(readFileSync(manualPath, 'utf8')) : {}
const allCoords = { ...cache, ...manual }

const esBairros = neighborhoods.filter((n) => n.state === 'ES')
const centroids = {}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocodeCity(city) {
  const q = `${city}, Espírito Santo, Brasil`
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
  const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0' } })
  const text = await res.text()
  if (!text.startsWith('[')) return null
  const data = JSON.parse(text)
  return data[0] ? { lat: +data[0].lat, lng: +data[0].lon } : null
}

for (const city of cities) {
  const cityBairros = esBairros.filter((b) => b.city === city.name)
  const withCoords = cityBairros
    .map((b) => allCoords[`${b.city}|${b.name}`])
    .filter((c) => c?.lat && c?.lng)

  if (withCoords.length > 0) {
    const lat = withCoords.reduce((s, c) => s + c.lat, 0) / withCoords.length
    const lng = withCoords.reduce((s, c) => s + c.lng, 0) / withCoords.length
    centroids[city.name] = { lat, lng, source: 'media_bairros', count: withCoords.length }
  }
}

const missingCities = cities.filter((c) => !centroids[c.name])
console.log(`Centroids from bairros: ${Object.keys(centroids).length}`)
console.log(`Cidades sem centroid: ${missingCities.length}`)

for (const city of missingCities) {
  process.stdout.write(`Geocodificando cidade ${city.name}... `)
  const coords = await geocodeCity(city.name)
  if (coords) {
    centroids[city.name] = { ...coords, source: 'geocode_cidade' }
    console.log('OK')
  } else {
    console.log('FALHOU')
  }
  await sleep(1200)
}

const outPath = join(root, 'data', 'city-centroids.json')
writeFileSync(outPath, JSON.stringify(centroids, null, 2))
console.log(`Salvo: ${outPath} (${Object.keys(centroids).length} cidades)`)
