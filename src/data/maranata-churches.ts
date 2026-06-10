import maranataData from './maranata-churches.generated.json'
import { getBairroCoordinates } from './es-locations'
import type { Coordinates } from './geo-utils'

export interface MaranataChurch {
  codigo: string
  nome: string
  cidade: string
  bairro: string
  bairroMaranata: string
  bairroHistorico?: string
  bairroResolvido: boolean
  logradouro?: string
  complemento?: string
  lat?: number
  lng?: number
  gpsFonte?: string
}

export const MARANATA_CHURCHES: MaranataChurch[] = maranataData.igrejas
export const MARANATA_STATS = {
  total: maranataData.total,
  totalComGps: (maranataData as { totalComGps?: number }).totalComGps ?? 0,
  geradoEm: maranataData.geradoEm,
  fonte: maranataData.fonte,
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const TRAILING_NUMBER = /\s+(?:n[º°.]?\s*)?(\d+|[IVXLCDM]+)\s*$/i

function stripNumber(text: string): string {
  let result = text.trim()
  let prev = ''
  while (prev !== result) {
    prev = result
    result = result.replace(TRAILING_NUMBER, '').trim()
  }
  return result
}

function normalizeRoman(text: string): string {
  return normalize(text)
    .replace(/\b1\b/g, 'i')
    .replace(/\b2\b/g, 'ii')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b5\b/g, 'v')
}

const byCodigo = new Map<string, MaranataChurch>()
for (const church of MARANATA_CHURCHES) {
  byCodigo.set(church.codigo, church)
}

export interface MaranataSearchHit {
  church: MaranataChurch
  matchedFrom: string
  matchKind: 'codigo' | 'nome_exato' | 'nome_prefixo' | 'nome_parcial'
  score: number
}

export function searchMaranataChurches(
  query: string,
  cidadeHint?: string
): MaranataSearchHit[] {
  const q = normalize(query)
  if (q.length < 2) return []

  const codeMatch = query.match(/\b(0[56]\d{4})\b/) ?? q.match(/^(\d{5,6})$/)
  if (codeMatch) {
    const church = byCodigo.get(codeMatch[1])
    if (church) {
      if (cidadeHint && normalize(church.cidade) !== normalize(cidadeHint)) return []
      return [{ church, matchedFrom: church.codigo, matchKind: 'codigo', score: 250 }]
    }
  }

  const qBase = normalize(stripNumber(query))
  const qRoman = normalizeRoman(stripNumber(query))
  const hits: MaranataSearchHit[] = []

  for (const church of MARANATA_CHURCHES) {
    if (cidadeHint && normalize(church.cidade) !== normalize(cidadeHint)) continue

    const nomeNorm = normalize(church.nome)
    const nomeBase = normalize(stripNumber(church.nome))
    const nomeRoman = normalizeRoman(stripNumber(church.nome))

    if (q === nomeNorm || qBase === nomeBase || qRoman === nomeRoman) {
      hits.push({ church, matchedFrom: church.nome, matchKind: 'nome_exato', score: 210 })
      continue
    }

    if (
      (nomeBase.startsWith(qBase) || qBase.startsWith(nomeBase)) &&
      qBase.length >= 3
    ) {
      hits.push({
        church,
        matchedFrom: church.nome,
        matchKind: 'nome_prefixo',
        score: 180 + Math.min(qBase.length, nomeBase.length),
      })
      continue
    }

    if (qBase.length >= 4 && (nomeNorm.includes(qBase) || qBase.includes(nomeBase))) {
      hits.push({
        church,
        matchedFrom: church.nome,
        matchKind: 'nome_parcial',
        score: 150 + qBase.length,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score)
}

export function getMaranataChurchByCodigo(codigo: string): MaranataChurch | undefined {
  return byCodigo.get(codigo)
}

export function getMaranataChurchCoordinates(church: MaranataChurch): Coordinates | undefined {
  if (church.lat != null && church.lng != null) {
    return { lat: church.lat, lng: church.lng }
  }
  return getBairroCoordinates(church.cidade, church.bairro)
}

export interface ChurchCoordsInput {
  bairro?: string
  cidade?: string
  lat?: number
  lng?: number
  codigoMaranata?: string
}

/** GPS da igreja: endereço ICM > bairro no mapa */
export function resolveChurchCoordinates(input: ChurchCoordsInput): Coordinates | undefined {
  if (input.lat != null && input.lng != null) {
    return { lat: input.lat, lng: input.lng }
  }

  if (input.codigoMaranata) {
    const church = getMaranataChurchByCodigo(input.codigoMaranata)
    if (church) {
      const coords = getMaranataChurchCoordinates(church)
      if (coords) return coords
    }
  }

  if (input.bairro && input.cidade) {
    return getBairroCoordinates(input.cidade, input.bairro)
  }

  return undefined
}
