import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const locations = JSON.parse(readFileSync(join(root, 'src/data/es-locations.generated.json'), 'utf8'))
const maranata = JSON.parse(readFileSync(join(root, 'src/data/maranata-churches.generated.json'), 'utf8'))

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const coordsIndex = new Map()
const cityCentroids = new Map()

for (const b of locations.bairros) {
  if (b.lat != null && b.lng != null) {
    coordsIndex.set(`${normalize(b.cidade)}|${normalize(b.nome)}`, { lat: b.lat, lng: b.lng })
  }
}

for (const [cidade, data] of Object.entries(locations.centroidesCidade ?? {})) {
  if (data?.lat != null) cityCentroids.set(normalize(cidade), data)
}

function getCoords(cidade, bairro) {
  const c = normalize(cidade)
  const b = normalize(bairro)
  const direct = coordsIndex.get(`${c}|${b}`)
  if (direct) return { ...direct, nivel: 'bairro_exato' }

  let best
  for (const [key, coords] of coordsIndex) {
    const [cityKey, nomeKey] = key.split('|')
    if (cityKey !== c) continue
    let score = 0
    if (nomeKey === b) return { ...coords, nivel: 'bairro_exato' }
    if (nomeKey.startsWith(b) || b.startsWith(nomeKey)) score = Math.min(nomeKey.length, b.length) + 10
    else if (nomeKey.includes(b) || b.includes(nomeKey)) score = Math.min(nomeKey.length, b.length)
    if (score >= 4 && (!best || score > best.score)) best = { coords, score }
  }
  if (best) return { ...best.coords, nivel: 'bairro_aproximado' }

  const centroid = cityCentroids.get(c)
  if (centroid) return { lat: centroid.lat, lng: centroid.lng, nivel: 'centroide_cidade' }

  return null
}

let exato = 0
let aproximado = 0
let centroide = 0
let semGps = 0
const semGpsExemplos = []

for (const ig of maranata.igrejas) {
  const hit = getCoords(ig.cidade, ig.bairro)
  if (!hit) {
    semGps++
    if (semGpsExemplos.length < 10) semGpsExemplos.push(`${ig.codigo} ${ig.nome} → ${ig.bairro}, ${ig.cidade}`)
    continue
  }
  if (hit.nivel === 'bairro_exato') exato++
  else if (hit.nivel === 'bairro_aproximado') aproximado++
  else centroide++
}

const total = maranata.total
const comGps = exato + aproximado + centroide

console.log('=== GPS das igrejas ICM (Maranata) ===\n')
console.log(`Total igrejas ES: ${total}`)
console.log(`GPS exato do bairro: ${exato} (${Math.round((exato / total) * 100)}%)`)
console.log(`GPS aproximado (bairro parecido): ${aproximado}`)
console.log(`GPS só centroide da cidade: ${centroide}`)
console.log(`Sem GPS: ${semGps}`)
console.log(`\nCobertura total: ${comGps}/${total} (${Math.round((comGps / total) * 100)}%)`)
const comGpsEndereco = maranata.igrejas.filter((ig) => ig.lat != null).length
const porFonte = {}
for (const ig of maranata.igrejas) {
  if (ig.gpsFonte) porFonte[ig.gpsFonte] = (porFonte[ig.gpsFonte] || 0) + 1
}

console.log(`\nGPS no cadastro ICM (endereço geocodificado): ${comGpsEndereco}/${total}`)
if (Object.keys(porFonte).length) console.log('Fontes GPS:', porFonte)
console.log(`Bairros ICM resolvidos no mapa: ${maranata.bairrosResolvidos}/${total}`)

if (semGpsExemplos.length) {
  console.log('\nExemplos sem GPS:')
  for (const e of semGpsExemplos) console.log(`  ${e}`)
}
