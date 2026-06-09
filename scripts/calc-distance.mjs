import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const cache = JSON.parse(readFileSync(join(root, 'data/es-coordinates.cache.json'), 'utf8'))
const locs = JSON.parse(readFileSync(join(root, 'src/data/es-locations.generated.json'), 'utf8'))

function haversine(a, b) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function findBairro(term) {
  return locs.bairros.find((b) => b.nome.toLowerCase().includes(term.toLowerCase()))
}

function getCoords(bairro) {
  const key = `${bairro.cidade}|${bairro.nome}`
  if (cache[key]) return cache[key]
  if (bairro.lat && bairro.lng) return { lat: bairro.lat, lng: bairro.lng }
  return null
}

async function geocode(bairro, cidade) {
  const q = `${bairro}, ${cidade}, Espírito Santo, Brasil`
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'br' })
  const res = await fetch(url, { headers: { 'User-Agent': 'ICMPedidos/1.0' } })
  const data = await res.json()
  return data[0] ? { lat: +data[0].lat, lng: +data[0].lon } : null
}

const normilia = findBairro('normília da cunha') ?? findBairro('normilia')
const recanto =
  findBairro('recanto da sereia') ??
  findBairro('recanto sereia') ??
  locs.bairros.find((b) => b.nome.toLowerCase().includes('sereia'))

console.log('Bairro 1:', normilia?.nome, '-', normilia?.cidade)
console.log('Bairro 2:', recanto?.nome, '-', recanto?.cidade)

if (!normilia || !recanto) {
  console.log('Bairro não encontrado na base.')
  if (!recanto) {
    console.log('Bairros com "sereia":', locs.bairros.filter((b) => b.nome.toLowerCase().includes('sereia')))
  }
  process.exit(1)
}

let c1 = getCoords(normilia)
let c2 = getCoords(recanto)

if (!c1) {
  c1 = await geocode(normilia.nome, normilia.cidade)
  console.log('Geocodificado:', normilia.nome, c1)
  await new Promise((r) => setTimeout(r, 1100))
}
if (!c2) {
  c2 = await geocode(recanto.nome, recanto.cidade)
  console.log('Geocodificado:', recanto.nome, c2)
}

if (c1 && c2) {
  const km = haversine(c1, c2)
  console.log(`\nDistância: ${km.toFixed(2)} km (${Math.round(km * 1000)} metros)`)
} else {
  console.log('Não foi possível obter coordenadas.')
}
