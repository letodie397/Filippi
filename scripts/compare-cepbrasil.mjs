import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const cities = require('brazilian-geographic-data/data/cities.json')

const esCities = cities.filter((c) => c.state === 'ES').map((c) => c.name).sort((a, b) => a.localeCompare(b, 'pt-BR'))
const esBairros = neighborhoods.filter((n) => n.state === 'ES')

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (match, name) => {
      const map = {
        aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
        atilde: 'ã', otilde: 'õ', ccedil: 'ç', ecirc: 'ê', ocirc: 'ô',
        acirc: 'â', auml: 'ä', uuml: 'ü', ntilde: 'ñ',
        Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
        Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', Ecirc: 'Ê', Ocirc: 'Ô',
        Acirc: 'Â', Iuml: 'Ï', Uuml: 'Ü', Ntilde: 'Ñ',
        aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
        agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
        Agrave: 'À', Egrave: 'È', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
        ordm: 'º', ordf: 'ª', quot: '"', apos: "'", lt: '<', gt: '>',
      }
      return map[name] ?? match
    })
}

function normalize(text) {
  return decodeHtmlEntities(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function toSlug(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseBairrosFromHtml(html) {
  const names = []
  const re = /<h4[^>]*>([^<]+)<\/h4>/gi
  let m
  while ((m = re.exec(html))) {
    const name = decodeHtmlEntities(m[1].trim())
    if (name && !name.toLowerCase().includes('mapa')) names.push(name)
  }
  if (names.length > 0) return names
  const mdRe = /^####\s+(.+)$/gm
  while ((m = mdRe.exec(html))) names.push(decodeHtmlEntities(m[1].trim()))
  return names
}

function parseStateLocalities(html) {
  const names = []
  const re = /<h4[^>]*>([^<]+)<\/h4>/gi
  let m
  while ((m = re.exec(html))) names.push(decodeHtmlEntities(m[1].trim()))
  if (names.length === 0) {
    const mdRe = /^####\s+(.+)$/gm
    while ((m = mdRe.exec(html))) names.push(decodeHtmlEntities(m[1].trim()))
  }
  return names
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ICMPedidos/1.0 (location-audit)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

function compareLists(ours, theirs, label) {
  const ourSet = new Set(ours.map(normalize))
  const theirSet = new Set(theirs.map(normalize))

  const onlyOurs = ours.filter((n) => !theirSet.has(normalize(n)))
  const onlyTheirs = theirs.filter((n) => !ourSet.has(normalize(n)))

  const matched = ours.filter((n) => theirSet.has(normalize(n)))

  return {
    label,
    ours: ours.length,
    theirs: theirs.length,
    matched: matched.length,
    onlyOurs,
    onlyTheirs,
    coveragePct: theirs.length ? Math.round((matched.length / theirs.length) * 100) : 100,
  }
}

function bairrosByCity(city) {
  return esBairros.filter((b) => b.city === city).map((b) => b.name).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

console.log('Buscando lista estadual no CEPBrasil...')
const stateHtml = await fetchPage('https://cepbrasil.org/espirito-santo/')
const stateLocalities = parseStateLocalities(stateHtml)

const municipiosCep = []
const distritosCep = []

for (const entry of stateLocalities) {
  const match = entry.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (match) {
    distritosCep.push({ nome: match[1].trim(), municipio: match[2].trim() })
  } else {
    municipiosCep.push(entry)
  }
}

const municipiosCepNorm = new Set(municipiosCep.map(normalize))
const esCitiesNorm = new Set(esCities.map(normalize))

const citiesOnlyOurs = esCities.filter((c) => !municipiosCepNorm.has(normalize(c)))
const citiesOnlyCep = municipiosCep.filter((c) => !esCitiesNorm.has(normalize(c)))

console.log(`\n=== CIDADES (municípios) ===`)
console.log(`IBGE (nosso banco): ${esCities.length}`)
console.log(`CEPBrasil (página ES): ${municipiosCep.length} municípios + ${distritosCep.length} distritos/povoados`)
console.log(`Municípios em comum: ${esCities.filter((c) => municipiosCepNorm.has(normalize(c))).length}`)
if (citiesOnlyOurs.length) console.log(`Só no nosso banco: ${citiesOnlyOurs.join(', ')}`)
if (citiesOnlyCep.length) console.log(`Só no CEPBrasil: ${citiesOnlyCep.join(', ')}`)

console.log(`\n=== BAIRROS POR CIDADE (amostra das 14 principais + demais) ===`)

const priority = [
  'Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Guarapari', 'Linhares', 'Colatina',
  'Cachoeiro de Itapemirim', 'Viana', 'Aracruz', 'São Mateus', 'Laranja da Terra',
  'Afonso Cláudio', 'Domingos Martins',
]
const citiesToCompare = [...new Set([...priority, ...esCities])]

const cityReports = []
let fetchErrors = 0

for (let i = 0; i < citiesToCompare.length; i++) {
  const city = citiesToCompare[i]
  const ours = bairrosByCity(city)
  if (ours.length === 0) continue

  const url = `https://cepbrasil.org/espirito-santo/${toSlug(city)}/`
  process.stdout.write(`[${i + 1}/${citiesToCompare.length}] ${city}... `)

  try {
    const html = await fetchPage(url)
    const theirs = parseBairrosFromHtml(html)
    const report = compareLists(ours, theirs, city)
    cityReports.push(report)
    console.log(`${report.matched}/${report.theirs} CEP (${report.coveragePct}%) | nosso: ${report.ours}`)
    await sleep(800)
  } catch (err) {
    fetchErrors++
    console.log(`ERRO: ${err.message}`)
    cityReports.push({ label: city, error: err.message, ours: ours.length })
    await sleep(1200)
  }
}

const okReports = cityReports.filter((r) => !r.error)
const totalOurs = okReports.reduce((s, r) => s + r.ours, 0)
const totalTheirs = okReports.reduce((s, r) => s + r.theirs, 0)
const totalMatched = okReports.reduce((s, r) => s + r.matched, 0)

const summary = {
  generatedAt: new Date().toISOString(),
  source: 'https://cepbrasil.org/espirito-santo/',
  municipios: {
    ibge: esCities.length,
    cepbrasil: municipiosCep.length,
    distritosCepbrasil: distritosCep.length,
    onlyIbge: citiesOnlyOurs,
    onlyCepbrasil: citiesOnlyCep,
  },
  bairros: {
    ibgeTotal: esBairros.length,
    citiesCompared: okReports.length,
    fetchErrors,
    totalMatched,
    totalCepbrasil: totalTheirs,
    totalIbgeInCompared: totalOurs,
    globalMatchPct: totalTheirs ? Math.round((totalMatched / totalTheirs) * 100) : 0,
  },
  cityReports: cityReports.sort((a, b) => (b.onlyTheirs?.length ?? 0) - (a.onlyTheirs?.length ?? 0)),
}

const outPath = join(root, 'data', 'cepbrasil-comparison.json')
writeFileSync(outPath, JSON.stringify(summary, null, 2))

console.log(`\n=== RESUMO BAIRROS ===`)
console.log(`IBGE total: ${esBairros.length}`)
console.log(`Cidades comparadas: ${okReports.length} (${fetchErrors} erros)`)
console.log(`Nomes coincidentes: ${totalMatched} de ${totalTheirs} no CEPBrasil (${summary.bairros.globalMatchPct}%)`)

const gaps = okReports.filter((r) => r.onlyTheirs?.length > 0 || r.onlyOurs?.length > 0)
console.log(`Cidades com diferenças de nome: ${gaps.length}`)

const topGaps = gaps
  .filter((r) => r.onlyTheirs?.length)
  .slice(0, 5)
for (const g of topGaps) {
  console.log(`\n  ${g.label} — faltam no nosso banco (${g.onlyTheirs.length}):`)
  console.log(`    ${g.onlyTheirs.slice(0, 8).join(' | ')}${g.onlyTheirs.length > 8 ? '...' : ''}`)
}

console.log(`\nRelatório salvo em data/cepbrasil-comparison.json`)
