import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const API = 'https://portal.presbiterio.org.br/v2/api/patrimonio/consulta-publica-igreja/igrejas'
const REPORT_PATH = join(root, 'data', 'maranata-comparison.json')

const PRIORITY_CITIES = [
  'VITÓRIA',
  'VILA VELHA',
  'SERRA',
  'CARIACICA',
  'VIANA',
  'GUARAPARI',
  'LINHARES',
  'COLATINA',
  'CACHOEIRO DE ITAPEMIRIM',
]

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function titleCaseCity(upper) {
  return upper
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/ De /g, ' de ')
    .replace(/ Do /g, ' do ')
    .replace(/ Da /g, ' da ')
    .replace(/ Das /g, ' das ')
    .replace(/ Dos /g, ' dos ')
    .replace(/ Itapemirim$/i, ' Itapemirim')
}

function parseChurchName(igrejaFmt) {
  const m = igrejaFmt?.match(/^\d+\s*-\s*(.+)$/)
  return m ? m[1].trim() : igrejaFmt
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
    headers: { 'User-Agent': 'ICMPedidos/1.0' },
  })
  const first = await firstRes.json()
  const all = [...first.registros]

  for (let page = 2; page <= first.paginas; page++) {
    params.set('PaginaAtual', String(page))
    const res = await fetch(`${API}?${params}`, {
      headers: { 'User-Agent': 'ICMPedidos/1.0' },
    })
    const data = await res.json()
    all.push(...data.registros)
    if (page % 10 === 0) process.stdout.write(`  página ${page}/${first.paginas}\n`)
    await new Promise((r) => setTimeout(r, 120))
  }

  return all
}

function loadOurBairros() {
  const generated = JSON.parse(
    readFileSync(join(root, 'src', 'data', 'es-locations.generated.json'), 'utf8')
  )
  const byCity = new Map()
  for (const b of generated.bairros) {
    const key = normalize(b.cidade)
    if (!byCity.has(key)) byCity.set(key, new Set())
    byCity.get(key).add(normalize(b.nome))
    for (const alias of b.aliases ?? []) {
      byCity.get(key).add(normalize(alias))
    }
  }
  return byCity
}

function findInOurDb(byCity, cidade, bairro) {
  const cityKey = normalize(titleCaseCity(cidade))
  const names = byCity.get(cityKey)
  if (!names) return { status: 'cidade_desconhecida' }
  const bNorm = normalize(bairro)
  if (names.has(bNorm)) return { status: 'ok' }

  for (const n of names) {
    if (n.includes(bNorm) || bNorm.includes(n)) return { status: 'parcial', match: n }
  }

  return { status: 'nao_encontrado' }
}

console.log('Baixando igrejas ES da API Maranata...')
const churches = await fetchAllEsChurches()
console.log(`Total: ${churches.length} igrejas\n`)

const byCity = loadOurBairros()
const unmatched = new Map()
const churchNameVsAddress = []

for (const church of churches) {
  const cidade = titleCaseCity(church.cidade)
  const bairroCadastro = church.bairro
  const nomeIgreja = parseChurchName(church.igrejaFmt)
  const check = findInOurDb(byCity, church.cidade, bairroCadastro)

  if (check.status !== 'ok') {
    const key = `${cidade}|${bairroCadastro}`
    if (!unmatched.has(key)) {
      unmatched.set(key, {
        cidade,
        bairroMaranata: bairroCadastro,
        status: check.status,
        matchParcial: check.match,
        igrejas: [],
        count: 0,
      })
    }
    const entry = unmatched.get(key)
    entry.count++
    if (entry.igrejas.length < 3) {
      entry.igrejas.push({
        codigo: church.igrejaFmt?.split(' - ')[0]?.trim(),
        nome: nomeIgreja,
        logradouro: church.logradouro,
      })
    }
  }

  const nomeNorm = normalize(nomeIgreja)
  const bairroNorm = normalize(bairroCadastro)
  if (
    nomeNorm !== bairroNorm &&
    !nomeNorm.includes(bairroNorm) &&
    !bairroNorm.includes(nomeNorm) &&
    nomeNorm.length >= 4
  ) {
    const nomeCheck = findInOurDb(byCity, church.cidade, nomeIgreja)
    if (nomeCheck.status === 'nao_encontrado' || nomeCheck.status === 'parcial') {
      churchNameVsAddress.push({
        cidade,
        nomeIgreja,
        bairroCadastro,
        nomeNoDb: nomeCheck.status,
        igrejaFmt: church.igrejaFmt,
      })
    }
  }
}

const unmatchedList = [...unmatched.values()].sort((a, b) => b.count - a.count)
const priorityNorm = new Set(PRIORITY_CITIES.map(normalize))
const priorityUnmatched = unmatchedList.filter((u) => priorityNorm.has(normalize(u.cidade)))

const report = {
  fonte: 'https://consulta-publica-igrejas.presbiterio.org.br',
  geradoEm: new Date().toISOString(),
  totalIgrejas: churches.length,
  bairrosSemMatch: unmatchedList.length,
  cidadesPrincipaisSemMatch: priorityUnmatched.length,
  prioridade: priorityUnmatched,
  todosSemMatch: unmatchedList,
  nomeIgrejaDiferenteDoBairro: churchNameVsAddress.slice(0, 100),
}

writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

console.log(`Bairros Maranata sem match no nosso cadastro: ${unmatchedList.length}`)
console.log(`  → cidades principais: ${priorityUnmatched.length}`)
console.log(`\nTop 15 (por qtd de igrejas):`)
for (const u of unmatchedList.slice(0, 15)) {
  console.log(`  ${u.count}x  ${u.bairroMaranata} (${u.cidade}) [${u.status}]`)
}
console.log(`\nRelatório: ${REPORT_PATH}`)

if (priorityUnmatched.length > 0) {
  console.log('\nCidades principais — bairros para revisar:')
  for (const u of priorityUnmatched.slice(0, 20)) {
    console.log(`  ${u.bairroMaranata} → ${u.cidade} (${u.count} igrejas)`)
  }
}
