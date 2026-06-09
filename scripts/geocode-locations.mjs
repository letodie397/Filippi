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

function loadCache() {
  if (!existsSync(cachePath)) return {}
  return JSON.parse(readFileSync(cachePath, 'utf8'))
}

function saveCache(cache) {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
}

function cacheKey(cidade, bairro) {
  return `${cidade}|${bairro}`
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

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ICMPedidos/1.0 (icm-pedidos-pwa)' },
    })

    if (!res.ok) continue

    const data = await res.json()
    if (data[0]) {
      return { lat: +data[0].lat, lng: +data[0].lon, source: data[0].display_name }
    }

    await sleep(1100)
  }

  return null
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const cache = loadCache()
  const missing = esBairros.filter((b) => !cache[cacheKey(b.city, b.name)])
  const limit = process.argv.includes('--all') ? missing.length : Math.min(missing.length, 50)

  console.log(`Total bairros ES: ${esBairros.length}`)
  console.log(`Já geocodificados: ${esBairros.length - missing.length}`)
  console.log(`A geocodificar agora: ${limit}`)

  let success = 0
  let failed = 0

  for (let i = 0; i < limit; i++) {
    const b = missing[i]
    const key = cacheKey(b.city, b.name)

    process.stdout.write(`[${i + 1}/${limit}] ${b.name}, ${b.city}... `)

    const coords = await geocode(b.name, b.city)
    if (coords) {
      cache[key] = coords
      success++
      console.log(`OK (${coords.lat}, ${coords.lng})`)
    } else {
      failed++
      console.log('FALHOU')
    }

    saveCache(cache)
    await sleep(1100)
  }

  console.log(`\nConcluído: ${success} sucesso, ${failed} falhas`)
  console.log(`Cache salvo em: ${cachePath}`)
  console.log(`Total no cache: ${Object.keys(cache).length}`)
}

main().catch(console.error)
