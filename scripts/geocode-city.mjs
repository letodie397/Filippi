import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const cidade = process.argv[2] || 'Vila Velha'
const cachePath = join(root, 'data', 'es-coordinates.cache.json')

const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const bairros = neighborhoods.filter((n) => n.state === 'ES' && n.city === cidade)
const missing = bairros.filter((b) => !cache[`${b.city}|${b.name}`])

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocode(bairro, city) {
  const queries = [
    `${bairro}, ${city}, Espírito Santo, Brasil`,
    `${bairro}, ${city}, ES, Brasil`,
  ]
  for (const q of queries) {
    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
    const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0' } })
    const text = await res.text()
    if (!text.startsWith('[')) return null
    const data = JSON.parse(text)
    if (data[0]) return { lat: +data[0].lat, lng: +data[0].lon }
    await sleep(1100)
  }
  return null
}

console.log(`Geocodificando ${missing.length} bairros de ${cidade}...`)
let ok = 0
let fail = 0

for (let i = 0; i < missing.length; i++) {
  const b = missing[i]
  const key = `${b.city}|${b.name}`
  process.stdout.write(`[${i + 1}/${missing.length}] ${b.name}... `)
  const coords = await geocode(b.name, b.city)
  if (coords) {
    cache[key] = coords
    ok++
    console.log('OK')
  } else {
    fail++
    console.log('FALHOU')
  }
  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  await sleep(1100)
}

console.log(`\n${ok} sucesso, ${fail} falhas. Total cache: ${Object.keys(cache).length}`)
