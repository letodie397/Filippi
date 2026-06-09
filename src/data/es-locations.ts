import locationsData from './es-locations.generated.json'
import { resolveHistoricalCoordinates } from './historical-bairros'
import type { Coordinates } from './geo-utils'
import { bairroKey } from './geo-utils'

export const ESTADO_ES = locationsData.estado
export const UF_ES = locationsData.uf

export interface BairroInfo {
  nome: string
  cidade: string
  aliases?: string[]
  lat?: number
  lng?: number
}

export const CIDADES_ES: string[] = locationsData.cidades

export const BAIRROS_ES: BairroInfo[] = locationsData.bairros

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

type CityCentroid = { lat: number; lng: number; source?: string }
const cityCentroidsIndex = new Map<string, CityCentroid>()

for (const [cidade, data] of Object.entries(
  (locationsData as { centroidesCidade?: Record<string, CityCentroid> }).centroidesCidade ?? {}
)) {
  if (data?.lat != null && data?.lng != null) {
    cityCentroidsIndex.set(normalize(cidade), { lat: data.lat, lng: data.lng, source: data.source })
  }
}

const bairrosByCidadeCache = new Map<string, BairroInfo[]>()
const coordinatesIndex = new Map<string, Coordinates>()

for (const b of BAIRROS_ES) {
  if (b.lat != null && b.lng != null) {
    coordinatesIndex.set(bairroKey(b.cidade, b.nome), { lat: b.lat, lng: b.lng })
  }
}

export function getBairroCoordinates(cidade: string, bairro: string): Coordinates | undefined {
  const resolved = resolveHistoricalCoordinates(cidade, bairro)
  if (resolved) {
    return getBairroCoordinates(resolved.cidade, resolved.bairro)
  }

  const direct = coordinatesIndex.get(bairroKey(cidade, bairro))
  if (direct) return direct

  const normBairro = normalize(bairro)
  const normCidade = normalize(cidade)
  let best: { coords: Coordinates; score: number } | undefined

  for (const b of BAIRROS_ES) {
    if (normalize(b.cidade) !== normCidade || b.lat == null || b.lng == null) continue

    const normNome = normalize(b.nome)
    let score = 0

    if (normNome === normBairro) return { lat: b.lat, lng: b.lng }
    if (normNome.startsWith(normBairro) || normBairro.startsWith(normNome)) {
      score = Math.min(normNome.length, normBairro.length) + 10
    } else if (normNome.includes(normBairro) || normBairro.includes(normNome)) {
      score = Math.min(normNome.length, normBairro.length)
    }

    if (score >= 4 && (!best || score > best.score)) {
      best = { coords: { lat: b.lat, lng: b.lng }, score }
    }
  }

  const cityCentroid = cityCentroidsIndex.get(normCidade)
  if (cityCentroid) return cityCentroid

  return best?.coords
}

export function getCidadeCoordinates(cidade: string): Coordinates | undefined {
  return cityCentroidsIndex.get(normalize(cidade))
}

export function getCoordinatesCount(): number {
  return coordinatesIndex.size
}

export function getBairrosByCidade(cidade: string): BairroInfo[] {
  const key = normalize(cidade)
  if (!bairrosByCidadeCache.has(key)) {
    bairrosByCidadeCache.set(
      key,
      BAIRROS_ES.filter((b) => normalize(b.cidade) === key)
    )
  }
  return bairrosByCidadeCache.get(key)!
}

export function getCidadesUnicas(): string[] {
  return [...CIDADES_ES]
}

export function getCidadesComBairros(): string[] {
  const cidades = new Set(BAIRROS_ES.map((b) => b.cidade))
  return Array.from(cidades).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function getLocationStats() {
  return {
    totalCidades: locationsData.totalCidades,
    totalBairros: locationsData.totalBairros,
    fonte: locationsData.fonte,
  }
}
