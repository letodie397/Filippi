import historicalData from '../../data/historical-bairros.json'

export interface HistoricalBairro {
  historico: string
  aliases?: string[]
  cidade: string
  bairroAtual: string
  extintoEm?: number
  nota?: string
}

export const HISTORICAL_BAIRROS: HistoricalBairro[] = historicalData

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function namesFor(entry: HistoricalBairro): string[] {
  return [entry.historico, ...(entry.aliases ?? [])]
}

export function findHistoricalBairro(
  query: string,
  cidadeHint?: string
): (HistoricalBairro & { matchedFrom: string }) | undefined {
  const q = normalize(query)
  if (q.length < 3) return undefined

  const tryMatch = (entry: HistoricalBairro) => {
    for (const name of namesFor(entry)) {
      const n = normalize(name)
      if (q === n) return { ...entry, matchedFrom: name }
      if (n.startsWith(q) && q.length >= 4) return { ...entry, matchedFrom: name }
      if (q.startsWith(n) && n.length >= 4) return { ...entry, matchedFrom: name }
      if (n.includes(q) && q.length >= 5) return { ...entry, matchedFrom: name }
    }
    return undefined
  }

  if (cidadeHint) {
    for (const entry of HISTORICAL_BAIRROS) {
      if (normalize(entry.cidade) !== normalize(cidadeHint)) continue
      const hit = tryMatch(entry)
      if (hit) return hit
    }
  }

  for (const entry of HISTORICAL_BAIRROS) {
    const hit = tryMatch(entry)
    if (hit) return hit
  }

  return undefined
}

export function resolveHistoricalCoordinates(
  cidade: string,
  bairro: string
): { cidade: string; bairro: string; historico?: string } | undefined {
  const bNorm = normalize(bairro)
  const cNorm = normalize(cidade)

  for (const entry of HISTORICAL_BAIRROS) {
    if (cNorm !== normalize(entry.cidade)) continue
    for (const name of namesFor(entry)) {
      if (normalize(name) === bNorm) {
        return {
          cidade: entry.cidade,
          bairro: entry.bairroAtual,
          historico: entry.historico,
        }
      }
    }
  }

  return undefined
}
