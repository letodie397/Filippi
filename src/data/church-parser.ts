import { BAIRROS_ES, CIDADES_ES } from './es-locations'
import { findHistoricalBairro } from './historical-bairros'
import type {
  ChurchIdentification,
  ChurchIdentificationCandidate,
  ChurchSearchResult,
  MatchType,
} from '../types'

const CHURCH_PREFIXES = [
  /^igreja\s+crist[ãa]\s+maranata\s*[-–—]?\s*/i,
  /^icm\s*[-–—]?\s*/i,
  /^maranata\s*[-–—]?\s*/i,
  /^congrega[çc][ãa]o\s+maranata\s*[-–—]?\s*/i,
  /^comum\s+maranata\s*[-–—]?\s*/i,
]

const TRAILING_NUMBER = /\s+(?:n[º°.]?\s*)?(\d+|[IVXLCDM]+)\s*$/i
const MIN_PREFIX_LENGTH = 3
const MAX_SUGGESTIONS = 8
const SELECTION_SCORE_GAP = 15

const CITY_PRIORITY: Record<string, number> = {
  Vitória: 50,
  'Vila Velha': 49,
  Serra: 48,
  Cariacica: 47,
  Viana: 46,
  Guarapari: 40,
  'Cachoeiro de Itapemirim': 38,
  Linhares: 35,
  Colatina: 34,
  'São Mateus': 33,
  Aracruz: 30,
}

interface RawCandidate {
  bairro: string
  cidade: string
  score: number
  matchedFrom: string
  matchType: MatchType
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function stripChurchNumber(text: string): string {
  let result = text.trim()
  let prev = ''
  while (prev !== result) {
    prev = result
    result = result.replace(TRAILING_NUMBER, '').trim()
  }
  return result
}

function cleanChurchName(name: string): string {
  let cleaned = name.trim()
  for (const prefix of CHURCH_PREFIXES) {
    cleaned = cleaned.replace(prefix, '')
  }
  cleaned = cleaned.replace(/\s*\(.*\)\s*/g, ' ').trim()
  cleaned = stripChurchNumber(cleaned)
  return cleaned
}

function findCityInText(text: string): string | undefined {
  const normalized = normalize(text)
  let best: { cidade: string; score: number } | undefined

  for (const cidade of CIDADES_ES) {
    const cityNorm = normalize(cidade)
    if (normalized.includes(cityNorm)) {
      const score = cityNorm.length + (CITY_PRIORITY[cidade] ?? 0)
      if (!best || score > best.score) best = { cidade, score }
    }
  }

  const shortNames: Record<string, string> = {
    cachoeiro: 'Cachoeiro de Itapemirim',
    vitoria: 'Vitória',
    'vila velha': 'Vila Velha',
    'sao mateus': 'São Mateus',
    'venda nova': 'Venda Nova do Imigrante',
    guarapari: 'Guarapari',
    itaparica: 'Vila Velha',
    itapua: 'Vila Velha',
  }

  for (const [short, full] of Object.entries(shortNames)) {
    if (normalized.includes(short)) {
      const score = short.length + (CITY_PRIORITY[full] ?? 0)
      if (!best || score > best.score) best = { cidade: full, score }
    }
  }

  return best?.cidade
}

function evaluateMatch(
  normalized: string,
  name: string,
  nameNorm: string,
  bairro: string,
  cidade: string
): RawCandidate | undefined {
  if (nameNorm.length < MIN_PREFIX_LENGTH && normalized !== nameNorm) return undefined

  const cityBonus = CITY_PRIORITY[cidade] ?? 0

  if (normalized === nameNorm) {
    return {
      bairro,
      cidade,
      score: 100 + nameNorm.length + cityBonus,
      matchedFrom: name,
      matchType: 'exato',
    }
  }

  if (nameNorm.startsWith(normalized) && normalized.length >= MIN_PREFIX_LENGTH) {
    const ratio = normalized.length / nameNorm.length
    return {
      bairro,
      cidade,
      score: 70 + normalized.length * 2 + ratio * 20 + cityBonus,
      matchedFrom: name,
      matchType: 'prefixo',
    }
  }

  if (normalized.startsWith(nameNorm) && nameNorm.length >= MIN_PREFIX_LENGTH) {
    return {
      bairro,
      cidade,
      score: 60 + nameNorm.length + cityBonus,
      matchedFrom: name,
      matchType: 'prefixo',
    }
  }

  const queryWords = normalized.split(/\s+/).filter(Boolean)
  const nameWords = nameNorm.split(/\s+/).filter(Boolean)

  if (queryWords.length === 1 && nameWords[0] === queryWords[0]) {
    return {
      bairro,
      cidade,
      score: 75 + queryWords[0].length + cityBonus,
      matchedFrom: nameWords[0],
      matchType: 'palavra',
    }
  }

  if (queryWords.length === 1 && nameWords[0]?.startsWith(queryWords[0])) {
    return {
      bairro,
      cidade,
      score: 55 + queryWords[0].length + cityBonus,
      matchedFrom: nameWords[0],
      matchType: 'prefixo',
    }
  }

  for (const word of nameWords) {
    if (word === normalized) {
      return {
        bairro,
        cidade,
        score: 50 + word.length + cityBonus,
        matchedFrom: word,
        matchType: 'palavra',
      }
    }
    if (word.startsWith(normalized) && normalized.length >= MIN_PREFIX_LENGTH) {
      return {
        bairro,
        cidade,
        score: 45 + normalized.length + cityBonus,
        matchedFrom: word,
        matchType: 'prefixo',
      }
    }
  }

  if (normalized.endsWith(' ' + nameNorm) || normalized.startsWith(nameNorm + ' ')) {
    return {
      bairro,
      cidade,
      score: 40 + nameNorm.length + cityBonus,
      matchedFrom: name,
      matchType: 'parcial',
    }
  }

  if (nameNorm.length >= 10 && normalized.includes(nameNorm)) {
    return {
      bairro,
      cidade,
      score: 35 + nameNorm.length + cityBonus,
      matchedFrom: name,
      matchType: 'parcial',
    }
  }

  return undefined
}

function dedupeCandidates(candidates: RawCandidate[]): RawCandidate[] {
  const map = new Map<string, RawCandidate>()
  for (const c of candidates) {
    const key = `${normalize(c.bairro)}|${normalize(c.cidade)}`
    const existing = map.get(key)
    if (!existing || c.score > existing.score) {
      map.set(key, c)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.score - a.score)
}

function toConfidence(score: number, matchType: MatchType): 'alta' | 'media' | 'baixa' {
  if (matchType === 'historico' || matchType === 'exato' || score >= 90) return 'alta'
  if (matchType === 'prefixo' || matchType === 'palavra' || score >= 60) return 'media'
  return 'baixa'
}

function historicalCandidate(
  query: string,
  cidadeHint?: string
): ChurchIdentificationCandidate | undefined {
  const hit = findHistoricalBairro(query, cidadeHint)
  if (!hit) return undefined

  const cityBonus = CITY_PRIORITY[hit.cidade] ?? 0
  return {
    bairro: hit.bairroAtual,
    cidade: hit.cidade,
    bairroHistorico: hit.historico,
    confidence: 'alta',
    matchedFrom: hit.matchedFrom,
    matchType: 'historico',
    score: 120 + hit.matchedFrom.length + cityBonus,
  }
}

function candidateToIdentification(c: RawCandidate): ChurchIdentificationCandidate {
  return {
    bairro: c.bairro,
    cidade: c.cidade,
    confidence: toConfidence(c.score, c.matchType),
    matchedFrom: c.matchedFrom,
    matchType: c.matchType,
    score: c.score,
  }
}

export function searchChurchLocations(nomeIgreja: string): ChurchSearchResult {
  const cleaned = cleanChurchName(nomeIgreja)
  const query = normalize(cleaned)

  if (query.length < MIN_PREFIX_LENGTH) {
    return { query: cleaned, suggestions: [], needsSelection: false }
  }

  const cidadeHint = findCityInText(cleaned) ?? findCityInText(nomeIgreja)

  const historical = historicalCandidate(cleaned, cidadeHint) ?? historicalCandidate(query, cidadeHint)

  function collectMatches(filterByCity?: string) {
    const results: RawCandidate[] = []
    for (const bairro of BAIRROS_ES) {
      if (filterByCity && normalize(bairro.cidade) !== normalize(filterByCity)) continue
      const names = [bairro.nome, ...(bairro.aliases ?? [])]
      for (const name of names) {
        const match = evaluateMatch(query, name, normalize(name), bairro.nome, bairro.cidade)
        if (match) results.push(match)
      }
    }
    return results
  }

  const raw = cidadeHint ? collectMatches(cidadeHint) : collectMatches()
  if (raw.length === 0 && cidadeHint) {
    raw.push(...collectMatches())
  }

  let suggestions = dedupeCandidates(raw)
    .slice(0, MAX_SUGGESTIONS)
    .map(candidateToIdentification)

  if (historical) {
    suggestions = [
      historical,
      ...suggestions.filter(
        (s) =>
          normalize(s.bairro) !== normalize(historical.bairro) ||
          normalize(s.cidade) !== normalize(historical.cidade)
      ),
    ].slice(0, MAX_SUGGESTIONS)
  }

  const best = suggestions[0]
  const second = suggestions[1]

  const needsSelection =
    suggestions.length > 1 &&
    best?.matchType !== 'exato' &&
    (!best || (second && best.score - second.score < SELECTION_SCORE_GAP))

  return {
    query: cleaned,
    best: best ? { ...best, bairro: best.bairro, cidade: best.cidade } : undefined,
    suggestions,
    needsSelection,
  }
}

export function identifyChurch(nomeIgreja: string): ChurchIdentification {
  const result = searchChurchLocations(nomeIgreja)

  if (result.best && !result.needsSelection) {
    return result.best
  }

  if (result.best) {
    return { ...result.best, confidence: 'media' }
  }

  const cleaned = cleanChurchName(nomeIgreja)
  const cidadeFromText = findCityInText(cleaned) ?? findCityInText(nomeIgreja)

  if (cidadeFromText) {
    const parts = cleaned.split(/[-–—,]/).map((p) => p.trim()).filter(Boolean)
    const possibleBairro = parts.find(
      (p) => normalize(p) !== normalize(cidadeFromText) && p.length > 2
    )

    return {
      bairro: possibleBairro ? stripChurchNumber(possibleBairro) : undefined,
      cidade: cidadeFromText,
      confidence: possibleBairro ? 'media' : 'baixa',
      matchedFrom: possibleBairro ?? cidadeFromText,
    }
  }

  if (cleaned.length > 2) {
    return {
      bairro: cleaned,
      cidade: undefined,
      confidence: 'baixa',
      matchedFrom: cleaned,
    }
  }

  return {
    confidence: 'baixa',
    matchedFrom: nomeIgreja,
  }
}
