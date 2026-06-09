import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import {
  toSlug,
  parseBairrosFromHtml,
  normalize,
  fetchPage,
  sleep,
  findIbgeMatch,
  CEP_SUPPLEMENT_CITIES,
} from './lib/cepbrasil-utils.mjs'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const neighborhoods = require('brazilian-geographic-data/data/neighborhoods.json')
const esBairros = neighborhoods.filter((n) => n.state === 'ES')

function bairrosByCity(city) {
  return esBairros.filter((b) => b.city === city).map((b) => b.name)
}

const supplement = []
const extraAliases = {}
let aliasCount = 0
let newCount = 0
let skippedInvalid = 0

console.log('Buscando bairros CEPBrasil para complementar IBGE...\n')

for (const city of CEP_SUPPLEMENT_CITIES) {
  const ibgeNames = bairrosByCity(city)
  if (ibgeNames.length === 0) {
    console.log(`${city}: sem bairros IBGE, pulando`)
    continue
  }

  const url = `https://cepbrasil.org/espirito-santo/${toSlug(city)}/`
  process.stdout.write(`${city}... `)

  try {
    const html = await fetchPage(url)
    const cepNames = parseBairrosFromHtml(html)

    if (cepNames.length < 5) {
      console.log(`lista CEP inválida (${cepNames.length} itens), pulando`)
      skippedInvalid++
      await sleep(800)
      continue
    }

    const ibgeNorm = new Set(ibgeNames.map(normalize))
    let cityNew = 0
    let cityAlias = 0

    for (const cepName of cepNames) {
      if (ibgeNorm.has(normalize(cepName))) continue

      const match = findIbgeMatch(cepName, ibgeNames)
      if (match) {
        const key = `${city}|${match}`
        if (!extraAliases[key]) extraAliases[key] = []
        if (!extraAliases[key].includes(cepName) && normalize(cepName) !== normalize(match)) {
          extraAliases[key].push(cepName)
          cityAlias++
          aliasCount++
        }
        continue
      }

      supplement.push({ cidade: city, nome: cepName, fonte: 'cepbrasil' })
      ibgeNorm.add(normalize(cepName))
      cityNew++
      newCount++
    }

    console.log(`+${cityNew} novos, ${cityAlias} aliases (CEP: ${cepNames.length}, IBGE: ${ibgeNames.length})`)
    await sleep(900)
  } catch (err) {
    console.log(`erro: ${err.message}`)
    skippedInvalid++
    await sleep(1200)
  }
}

const supplementPath = join(root, 'data', 'cepbrasil-supplement.json')
const aliasesPath = join(root, 'data', 'cepbrasil-extra-aliases.json')

writeFileSync(supplementPath, JSON.stringify(supplement, null, 2))
writeFileSync(aliasesPath, JSON.stringify(extraAliases, null, 2))

console.log(`\n=== RESULTADO ===`)
console.log(`Novos bairros CEPBrasil: ${newCount}`)
console.log(`Aliases adicionais: ${aliasCount}`)
console.log(`Cidades com CEP inválido: ${skippedInvalid}`)
console.log(`Salvo: data/cepbrasil-supplement.json`)
console.log(`Salvo: data/cepbrasil-extra-aliases.json`)
