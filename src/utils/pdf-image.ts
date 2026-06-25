/**
 * Converte qualquer src (URL https:// ou data URL base64) num objeto HTMLImageElement
 * aguardando o carregamento completo. Retorna null em caso de erro.
 */
async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Se CORS falhou, tenta via fetch → blob → object URL
      if (src.startsWith('https://')) {
        fetch(src)
          .then((r) => r.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob)
            const img2 = new Image()
            img2.onload = () => {
              URL.revokeObjectURL(url)
              resolve(img2)
            }
            img2.onerror = () => resolve(null)
            img2.src = url
          })
          .catch(() => resolve(null))
      } else {
        resolve(null)
      }
    }
    img.src = src
  })
}

/**
 * Adiciona uma imagem ao jsPDF de forma assíncrona (aguarda o carregamento).
 * Retorna a altura real usada (mm) ou 0 se falhou.
 */
export async function addImageAsync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  src: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number
): Promise<number> {
  if (!src) return 0
  try {
    const img = await loadImg(src)
    if (!img) return 0

    const nW = img.naturalWidth || 1
    const nH = img.naturalHeight || 1
    let w = maxW
    let h = (nH / nW) * w
    if (h > maxH) {
      h = maxH
      w = (nW / nH) * h
    }
    doc.addImage(img, 'JPEG', x, y, w, h)
    return h
  } catch {
    return 0
  }
}
