export function decodeHtmlEntities(text) {
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
        agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
        Agrave: 'À', Egrave: 'È', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
        ordm: 'º', ordf: 'ª', quot: '"', apos: "'", lt: '<', gt: '>',
      }
      return map[name] ?? match
    })
}

export function normalize(text) {
  return decodeHtmlEntities(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function compactNormalize(text) {
  return normalize(text)
    .replace(/^bairro\s+/, '')
    .replace(/\s+de\s+/g, ' ')
    .replace(/[^a-z0-9]/g, '')
}

export function toSlug(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseBairrosFromHtml(html) {
  const names = []
  const re = /<h4[^>]*>([^<]+)<\/h4>/gi
  let m
  while ((m = re.exec(html))) {
    const name = decodeHtmlEntities(m[1].trim())
    if (!name || name.toLowerCase().includes('mapa')) continue
    if (/^cep\s+\d/i.test(name)) continue
    if (/rodovia\s+/i.test(name)) continue
    names.push(name)
  }
  if (names.length > 0) return names
  const mdRe = /^####\s+(.+)$/gm
  while ((m = mdRe.exec(html))) {
    const name = decodeHtmlEntities(m[1].trim())
    if (!/^cep\s+\d/i.test(name)) names.push(name)
  }
  return names
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ICMPedidos/1.0 (location-audit)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.text()
}

export function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export function findIbgeMatch(cepName, ibgeNames) {
  const n = normalize(cepName)
  const c = compactNormalize(cepName)

  for (const ibge of ibgeNames) {
    if (normalize(ibge) === n) return ibge
  }

  for (const ibge of ibgeNames) {
    const ic = compactNormalize(ibge)
    if (c === ic) return ibge
    if (c.length >= 4 && ic.length >= 4 && (c.includes(ic) || ic.includes(c))) return ibge
  }

  for (const ibge of ibgeNames) {
    const ic = compactNormalize(ibge)
    if (c.length >= 5 && ic.length >= 5) {
      const dist = levenshtein(c, ic)
      const maxLen = Math.max(c.length, ic.length)
      if (dist <= 2 && dist / maxLen < 0.2) return ibge
    }
  }

  const sectorMatch = cepName.match(/^Cidade Continental-Setor\s+(.+)$/i)
  if (sectorMatch) {
    const match = ibgeNames.find((x) => compactNormalize(x) === 'cidadecontinental')
    if (match) return match
  }

  return null
}

/** Cidades cujo CEPBrasil lista bairros postais reais (não só distritos/CEP genérico) */
export const CEP_SUPPLEMENT_CITIES = [
  'Vitória',
  'Vila Velha',
  'Serra',
  'Cariacica',
  'Guarapari',
  'Linhares',
  'Cachoeiro de Itapemirim',
  'Viana',
  'Aracruz',
  'Colatina',
  'Alegre',
  'São Gabriel da Palha',
  'Iúna',
]
