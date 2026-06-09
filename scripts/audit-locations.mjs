import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const generatedPath = join(root, 'src', 'data', 'es-locations.generated.json')

if (!existsSync(generatedPath)) {
  console.error('Rode npm run build:locations primeiro')
  process.exit(1)
}

const gen = JSON.parse(readFileSync(generatedPath, 'utf8'))
const byCity = {}

for (const b of gen.bairros) {
  if (!byCity[b.cidade]) byCity[b.cidade] = { total: 0, gps: 0, ibge: 0, cep: 0, missing: [] }
  byCity[b.cidade].total++
  if (b.fonte === 'cepbrasil') byCity[b.cidade].cep++
  else byCity[b.cidade].ibge++
  if (b.lat && b.lng) byCity[b.cidade].gps++
  else byCity[b.cidade].missing.push(b.nome)
}

console.log('=== Auditoria de Localidades ES ===\n')
console.log(`Bairros: ${gen.totalBairros} (${gen.totalBairrosIbge ?? '?'} IBGE + ${gen.totalBairrosCepbrasil ?? '?'} CEPBrasil)`)
console.log(`GPS: ${gen.totalComGps}/${gen.totalBairros}`)
console.log(`Centroides cidade: ${gen.totalCentroidesCidade ?? Object.keys(gen.centroidesCidade ?? {}).length}/78\n`)

const major = ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Guarapari', 'Linhares', 'Colatina', 'Cachoeiro de Itapemirim']
for (const city of major) {
  const data = byCity[city]
  if (!data) continue
  const pct = ((data.gps / data.total) * 100).toFixed(0)
  console.log(`  ${city}: ${data.gps}/${data.total} GPS (${pct}%) — IBGE ${data.ibge} + CEP ${data.cep}`)
}

const missing = gen.bairros.filter((b) => !b.lat || !b.lng)
if (missing.length > 0) {
  console.log(`\nSem GPS (${missing.length}):`)
  for (const b of missing.slice(0, 15)) console.log(`  ${b.cidade}|${b.nome}`)
  if (missing.length > 15) console.log(`  ... e mais ${missing.length - 15}`)
} else {
  console.log('\nTodos os bairros têm coordenadas.')
}
