import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { searchChurchLocations } from '../../src/data/church-parser.ts'
import { getBairroCoordinates, getCidadeCoordinates, BAIRROS_ES } from '../../src/data/es-locations.ts'
import { haversineDistanceKm, PROXIMITY_RADIUS_KM } from '../../src/data/geo-utils.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

type TestCase = {
  name: string
  input: string
  expectBairro?: string
  expectCidade: string
  minConfidence?: 'alta' | 'media' | 'baixa'
  needsGps?: boolean
}

const CHURCH_CASES: TestCase[] = [
  { name: 'Vila Velha - Normília', input: 'normilia 1', expectBairro: 'Normília da Cunha', expectCidade: 'Vila Velha', minConfidence: 'media' },
  { name: 'Vila Velha - Barramares', input: 'barramares 1', expectBairro: 'Barramares', expectCidade: 'Vila Velha' },
  { name: 'Vila Velha - Itaparica', input: 'itaparica 2', expectCidade: 'Vila Velha', minConfidence: 'media' },
  { name: 'Vitória - Santa Helena', input: 'santa helena 1', expectCidade: 'Vitória', minConfidence: 'media' },
  { name: 'Guarapari - Ipiranga', input: 'ipiranga 1', expectBairro: 'Ipiranga', expectCidade: 'Guarapari' },
  { name: 'Vitória - Jardim da Penha', input: 'jardim da penha 1', expectCidade: 'Vitória', minConfidence: 'media' },
  { name: 'Serra - Laranjeiras', input: 'laranjeiras 1', expectCidade: 'Serra', minConfidence: 'media' },
  { name: 'Cariacica - Campo Grande', input: 'campo grande 1', expectCidade: 'Cariacica', minConfidence: 'media' },
  { name: 'Guarapari - Centro', input: 'centro guarapari 1', expectCidade: 'Guarapari', minConfidence: 'baixa' },
  { name: 'Linhares - Centro', input: 'linhares centro 1', expectCidade: 'Linhares', minConfidence: 'baixa' },
  { name: 'Colatina - Centro', input: 'colatina 1', expectCidade: 'Colatina', minConfidence: 'baixa' },
  { name: 'Cachoeiro - Centro', input: 'cachoeiro centro 1', expectCidade: 'Cachoeiro de Itapemirim', minConfidence: 'baixa' },
  { name: 'Viana - Centro', input: 'viana centro 1', expectCidade: 'Viana', minConfidence: 'baixa' },
  { name: 'Vila Velha - Ponta da Fruta', input: 'balneario 1', expectCidade: 'Vila Velha', minConfidence: 'media' },
  {
    name: 'Vila Velha - Ilha da Jussara (histórico)',
    input: 'ilha da jussara 1',
    expectBairro: 'Ulisses Guimarães',
    expectCidade: 'Vila Velha',
  },
  {
    name: 'Vila Velha - Jussara (histórico)',
    input: 'jussara 2',
    expectBairro: 'Ulisses Guimarães',
    expectCidade: 'Vila Velha',
  },
  {
    name: 'Vitória - Miramar (histórico)',
    input: 'miramar 1',
    expectBairro: 'Comdusa',
    expectCidade: 'Vitória',
  },
  {
    name: 'Vitória - Alto Caratoíra (sub-bairro)',
    input: 'alto caratoira 1',
    expectBairro: 'Caratoíra',
    expectCidade: 'Vitória',
  },
  {
    name: 'Serra - Itapocu (histórico)',
    input: 'itapocu 1',
    expectBairro: 'Calogi',
    expectCidade: 'Serra',
  },
  {
    name: 'Vitória - Chapada (sub-bairro)',
    input: 'chapada 1',
    expectBairro: 'do Quadro',
    expectCidade: 'Vitória',
  },
  {
    name: 'Maranata - Ilha da Jussara I (oficial)',
    input: 'ilha da jussara 1',
    expectBairro: 'Ulisses Guimarães',
    expectCidade: 'Vila Velha',
    minConfidence: 'alta',
  },
  {
    name: 'Maranata - código 060380 (Ilha dos Ayres)',
    input: '060380',
    expectBairro: 'Ilha dos Ayres',
    expectCidade: 'Vila Velha',
  },
  {
    name: 'Maranata - Normilia I (oficial)',
    input: 'normilia 1',
    expectBairro: 'Normília da Cunha',
    expectCidade: 'Vila Velha',
  },
  {
    name: 'Maranata - Ilha dos Ayres I',
    input: 'ilha dos ayres 1',
    expectBairro: 'Ilha dos Ayres',
    expectCidade: 'Vila Velha',
  },
]

const PROXIMITY_CASES = [
  {
    name: 'Normília ↔ Barramares (Vila Velha)',
    a: { cidade: 'Vila Velha', bairro: 'Normília da Cunha' },
    b: { cidade: 'Vila Velha', bairro: 'Barramares' },
    maxKm: PROXIMITY_RADIUS_KM,
  },
  {
    name: 'Normília ↔ Balneário Ponta da Fruta',
    a: { cidade: 'Vila Velha', bairro: 'Normília da Cunha' },
    b: { cidade: 'Vila Velha', bairro: 'Balneário Ponta da Fruta' },
    maxKm: PROXIMITY_RADIUS_KM,
  },
]

const confidenceRank = { alta: 3, media: 2, baixa: 1 }

let passed = 0
let failed = 0
const failures: string[] = []

function pass(msg: string) {
  passed++
  console.log(`  ✓ ${msg}`)
}

function fail(msg: string) {
  failed++
  failures.push(msg)
  console.log(`  ✗ ${msg}`)
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

console.log('\n=== TESTES DE LOCALIZAÇÃO / MAPA ===\n')

// 1. Cobertura GPS por cidade
console.log('1. Cobertura GPS por cidade')
const generated = JSON.parse(
  readFileSync(join(root, 'src/data/es-locations.generated.json'), 'utf8')
)
const byCity: Record<string, { total: number; gps: number }> = {}
for (const b of generated.bairros as { nome: string; cidade: string; lat?: number; lng?: number }[]) {
  if (!byCity[b.cidade]) byCity[b.cidade] = { total: 0, gps: 0 }
  byCity[b.cidade].total++
  if (b.lat && b.lng) byCity[b.cidade].gps++
}

const majorCities = ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Guarapari', 'Linhares', 'Colatina', 'Cachoeiro de Itapemirim']
let citiesWithoutCentroid = 0
for (const city of majorCities) {
  const data = byCity[city]
  const centroid = getCidadeCoordinates(city)
  const pct = data ? ((data.gps / data.total) * 100).toFixed(0) : '0'
  if (!centroid) citiesWithoutCentroid++
  console.log(`     ${city}: ${data?.gps ?? 0}/${data?.total ?? 0} GPS (${pct}%)${centroid ? ' + centroide' : ' SEM centroide'}`)
}
if (citiesWithoutCentroid === 0) pass('Todas as cidades principais têm centroide')
else fail(`${citiesWithoutCentroid} cidades principais sem centroide`)

const totalBairros = generated.totalBairros ?? BAIRROS_ES.length
const totalGps = generated.totalComGps ?? 0
if (totalGps === totalBairros) pass(`Cobertura global GPS: ${totalGps}/${totalBairros} (100%)`)
else fail(`Cobertura GPS incompleta: ${totalGps}/${totalBairros}`)

const cepSupplement = generated.totalBairrosCepbrasil ?? 0
if (cepSupplement > 0) pass(`Base CEPBrasil integrada: +${cepSupplement} bairros além do IBGE`)

// 2. Parser de igrejas
console.log('\n2. Identificação de igrejas por cidade')
for (const tc of CHURCH_CASES) {
  const result = searchChurchLocations(tc.input)
  const best = result.best ?? result.suggestions[0]

  if (!best?.cidade) {
    fail(`${tc.name}: nenhuma cidade encontrada para "${tc.input}"`)
    continue
  }

  if (normalize(best.cidade) !== normalize(tc.expectCidade)) {
    fail(`${tc.name}: esperava cidade "${tc.expectCidade}", obteve "${best.cidade}"`)
    continue
  }

  if (tc.expectBairro && best.bairro && normalize(best.bairro) !== normalize(tc.expectBairro)) {
    fail(`${tc.name}: esperava bairro "${tc.expectBairro}", obteve "${best.bairro}"`)
    continue
  }

  if (tc.minConfidence) {
    const got = confidenceRank[best.confidence]
    const min = confidenceRank[tc.minConfidence]
    if (got < min) {
      fail(`${tc.name}: confiança ${best.confidence} abaixo de ${tc.minConfidence}`)
      continue
    }
  }

  const coords = best.bairro ? getBairroCoordinates(best.cidade, best.bairro) : getCidadeCoordinates(best.cidade)
  if (!coords) {
    fail(`${tc.name}: sem coordenadas para ${best.bairro ?? ''}, ${best.cidade}`)
    continue
  }

  pass(`${tc.name} → ${best.bairro ?? '?'}, ${best.cidade} (${best.confidence})`)
}

// 3. Proximidade GPS
console.log('\n3. Distâncias de proximidade (raio ' + PROXIMITY_RADIUS_KM + ' km)')
for (const pc of PROXIMITY_CASES) {
  const coordsA = getBairroCoordinates(pc.a.cidade, pc.a.bairro)
  const coordsB = getBairroCoordinates(pc.b.cidade, pc.b.bairro)
  if (!coordsA || !coordsB) {
    fail(`${pc.name}: coordenadas ausentes`)
    continue
  }
  const dist = haversineDistanceKm(coordsA, coordsB)
  if (dist <= pc.maxKm) {
    pass(`${pc.name}: ${dist.toFixed(1)} km`)
  } else {
    fail(`${pc.name}: ${dist.toFixed(1)} km (acima de ${pc.maxKm} km)`)
  }
}

// 4. Amostra aleatória de bairros com GPS em cada cidade principal
console.log('\n4. Amostra de GPS por cidade (1 bairro cada)')
for (const city of majorCities) {
  const sample = BAIRROS_ES.find((b) => b.cidade === city && b.lat && b.lng)
  if (sample) {
    const coords = getBairroCoordinates(city, sample.nome)
    if (coords) pass(`${city}: ${sample.nome} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
    else fail(`${city}: falha ao resolver ${sample.nome}`)
  } else {
    const centroid = getCidadeCoordinates(city)
    if (centroid) pass(`${city}: usando centroide → ${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}`)
    else fail(`${city}: sem bairro GPS e sem centroide`)
  }
}

console.log(`\n--- Localização: ${passed} ok, ${failed} falhas ---`)
if (failures.length) {
  console.log('\nFalhas:')
  failures.forEach((f) => console.log(`  - ${f}`))
}

process.exit(failed > 0 ? 1 : 0)
