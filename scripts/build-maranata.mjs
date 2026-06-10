import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const API = 'https://portal.presbiterio.org.br/v2/api/patrimonio/consulta-publica-igreja/igrejas'

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function fixEncoding(text) {
  return String(text ?? '')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã­/g, 'í')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã§/g, 'ç')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(text) {
  return fixEncoding(text)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      if (['de', 'do', 'da', 'dos', 'das', 'e'].includes(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
    .replace(/ De /g, ' de ')
    .replace(/ Do /g, ' do ')
    .replace(/ Da /g, ' da ')
    .replace(/ Das /g, ' das ')
    .replace(/ Dos /g, ' dos ')
}

function normalizeRomanNumerals(text) {
  return normalize(text)
    .replace(/\b1\b/g, 'i')
    .replace(/\b2\b/g, 'ii')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b5\b/g, 'v')
}

function parseChurchRecord(igrejaFmt) {
  const m = String(igrejaFmt ?? '').match(/^(\d+)\s*-\s*(.+)$/)
  return {
    codigo: m?.[1] ?? '',
    nome: fixEncoding(m?.[2]?.trim() ?? igrejaFmt),
  }
}

async function fetchAllEsChurches() {
  const params = new URLSearchParams({
    Uf: 'ES',
    PaginaAtual: '1',
    PorPagina: '50',
    OrdenadoPor: 'igreja',
    OrdenadoDirecao: 'asc',
  })

  const firstRes = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': 'ICMPedidos/1.0 (build-maranata)' },
  })
  if (!firstRes.ok) throw new Error(`API HTTP ${firstRes.status}`)
  const first = await firstRes.json()
  const all = [...first.registros]

  for (let page = 2; page <= first.paginas; page++) {
    params.set('PaginaAtual', String(page))
    const res = await fetch(`${API}?${params}`, {
      headers: { 'User-Agent': 'ICMPedidos/1.0 (build-maranata)' },
    })
    const data = await res.json()
    all.push(...data.registros)
    if (page % 10 === 0) process.stdout.write(`  página ${page}/${first.paginas}\n`)
    await new Promise((r) => setTimeout(r, 100))
  }

  return all
}

function loadBairrosIndex() {
  const generatedPath = join(root, 'src', 'data', 'es-locations.generated.json')
  if (!existsSync(generatedPath)) {
    throw new Error('Rode npm run build:locations antes de build:maranata')
  }
  const generated = JSON.parse(readFileSync(generatedPath, 'utf8'))
  const byCity = new Map()

  for (const b of generated.bairros) {
    const cityKey = normalize(b.cidade)
    if (!byCity.has(cityKey)) byCity.set(cityKey, [])
    byCity.get(cityKey).push(b)
  }

  return byCity
}

function loadManualAliases() {
  const path = join(root, 'data', 'maranata-bairro-aliases.json')
  const list = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : []
  const map = new Map()
  for (const item of list) {
    map.set(`${normalize(item.cidade)}|${normalize(item.maranata)}`, item.bairro)
  }
  return map
}

function loadHistorical() {
  const path = join(root, 'data', 'historical-bairros.json')
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf8'))
}

function resolveBairro(cidade, bairroMaranata, byCity, manualAliases, historical) {
  const cidadeTitle = titleCase(cidade)
  const cityKey = normalize(cidadeTitle)
  const bairroFixed = fixEncoding(bairroMaranata)
  const bNorm = normalize(bairroFixed)
  const bRoman = normalizeRomanNumerals(bairroFixed)

  const manual = manualAliases.get(`${cityKey}|${bNorm}`)
  if (manual) return { bairro: manual, resolvido: true, metodo: 'alias' }

  for (const h of historical) {
    if (normalize(h.cidade) !== cityKey) continue
    const names = [h.historico, ...(h.aliases ?? [])]
    for (const name of names) {
      if (normalize(name) === bNorm || normalizeRomanNumerals(name) === bRoman) {
        return { bairro: h.bairroAtual, resolvido: true, metodo: 'historico', historico: h.historico }
      }
    }
  }

  const cityBairros = byCity.get(cityKey) ?? []

  for (const b of cityBairros) {
    const nomeNorm = normalize(b.nome)
    const nomeRoman = normalizeRomanNumerals(b.nome)
    if (nomeNorm === bNorm || nomeRoman === bRoman) {
      return { bairro: b.nome, resolvido: true, metodo: 'exato' }
    }
    for (const alias of b.aliases ?? []) {
      const aliasNorm = normalize(alias)
      if (aliasNorm === bNorm || normalizeRomanNumerals(alias) === bRoman) {
        return { bairro: b.nome, resolvido: true, metodo: 'alias_db' }
      }
    }
  }

  let best
  for (const b of cityBairros) {
    const nomeNorm = normalize(b.nome)
    const nomeRoman = normalizeRomanNumerals(b.nome)
    let score = 0
    if (nomeNorm.startsWith(bNorm) || bNorm.startsWith(nomeNorm)) {
      score = Math.min(nomeNorm.length, bNorm.length) + 10
    } else if (nomeNorm.includes(bNorm) || bNorm.includes(nomeNorm)) {
      score = Math.min(nomeNorm.length, bNorm.length)
    } else if (nomeRoman === bRoman) {
      score = nomeRoman.length + 15
    }
    if (score >= 5 && (!best || score > best.score)) {
      best = { bairro: b.nome, score, metodo: 'fuzzy' }
    }
  }

  if (best) return { bairro: best.bairro, resolvido: true, metodo: best.metodo }

  return { bairro: titleCase(bairroFixed), resolvido: false, metodo: 'fallback' }
}

console.log('Baixando igrejas ES (API Maranata)...')
const raw = await fetchAllEsChurches()
console.log(`  ${raw.length} registros`)

const byCity = loadBairrosIndex()
const manualAliases = loadManualAliases()
const historical = loadHistorical()
const coordsCachePath = join(root, 'data', 'maranata-coordinates.cache.json')
const coordsCache = existsSync(coordsCachePath)
  ? JSON.parse(readFileSync(coordsCachePath, 'utf8'))
  : {}

const igrejas = []
let resolvidos = 0
let naoResolvidos = 0

for (const row of raw) {
  const { codigo, nome } = parseChurchRecord(row.igrejaFmt)
  const cidade = titleCase(row.cidade)
  const bairroMaranata = fixEncoding(row.bairro)
  const resolved = resolveBairro(row.cidade, bairroMaranata, byCity, manualAliases, historical)

  if (resolved.resolvido) resolvidos++
  else naoResolvidos++

  const entry = {
    codigo,
    nome,
    cidade,
    bairro: resolved.bairro,
    bairroMaranata,
    bairroHistorico: resolved.historico,
    bairroResolvido: resolved.resolvido,
    logradouro: fixEncoding(row.logradouro),
    complemento: row.complemento ? fixEncoding(row.complemento) : undefined,
  }

  const coords = coordsCache[codigo]
  if (coords?.lat != null && coords?.lng != null) {
    entry.lat = coords.lat
    entry.lng = coords.lng
    entry.gpsFonte = coords.source
  }

  igrejas.push(entry)
}

igrejas.sort((a, b) => a.codigo.localeCompare(b.codigo))

const comGps = igrejas.filter((ig) => ig.lat != null && ig.lng != null).length

const output = {
  fonte: 'https://consulta-publica-igrejas.presbiterio.org.br',
  api: API,
  uf: 'ES',
  geradoEm: new Date().toISOString(),
  total: igrejas.length,
  bairrosResolvidos: resolvidos,
  bairrosNaoResolvidos: naoResolvidos,
  totalComGps: comGps,
  igrejas,
}

const outPath = join(root, 'src', 'data', 'maranata-churches.generated.json')
writeFileSync(outPath, JSON.stringify(output))

console.log(`\nGerado: ${outPath}`)
console.log(`  ${igrejas.length} igrejas`)
console.log(`  Bairros resolvidos no mapa: ${resolvidos}/${igrejas.length} (${Math.round((resolvidos / igrejas.length) * 100)}%)`)
console.log(`  Com GPS (endereço ICM): ${comGps}/${igrejas.length} (${Math.round((comGps / igrejas.length) * 100)}%)`)
if (naoResolvidos > 0) {
  console.log(`  ${naoResolvidos} com bairro só do cadastro ICM (use maranata-bairro-aliases.json)`)
}
if (comGps < igrejas.length) {
  console.log(`  Rode npm run geocode:maranata para geocodificar endereços faltantes`)
} else {
  console.log(`  GPS completo no cadastro ICM`)
}
