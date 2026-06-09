import { writeFileSync, readFileSync, existsSync } from 'fs'
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
const allKnown = { ...cache, ...manual }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function geocode(bairro, cidade) {
  const queries = [
    `${bairro}, ${cidade}, Espírito Santo, Brasil`,
    `${bairro}, ${cidade}, ES, Brasil`,
  ]
  for (const q of queries) {
    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
    const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0 (icm-pedidos)' } })
    const text = await res.text()
    if (text.startsWith('[')) {
      const data = JSON.parse(text)
      if (data[0]) return { lat: +data[0].lat, lng: +data[0].lon }
    }
    await sleep(1200)
  }
  return null
}

const missing = esBairros.filter((b) => !allKnown[`${b.city}|${b.name}`])
console.log(`Faltam geocodificar: ${missing.length} de ${esBairros.length}`)

let ok = 0
let fail = 0

for (let i = 0; i < missing.length; i++) {
  const b = missing[i]
  const key = `${b.city}|${b.name}`
  process.stdout.write(`[${i + 1}/${missing.length}] ${b.name}, ${b.city}... `)

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
  await sleep(1200)
}

console.log(`\nConcluído: ${ok} OK, ${fail} falhas`)
console.log(`Total cache: ${Object.keys(cache).length}`)
