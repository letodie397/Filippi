import { jsPDF } from 'jspdf'
import { addImageAsync } from './pdf-image'
import type { Order, RelatorioEntry, MaterialItem } from '../types'

const RED = '#c0392b'
const DARK = '#1e293b'
const GRAY = '#64748b'

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth()
}

function pageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight()
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > pageHeight(doc) - 20) {
    doc.addPage()
    return 20
  }
  return y
}

function headerSection(doc: jsPDF, order: Order) {
  const w = pageWidth(doc)
  doc.setFillColor(RED)
  doc.rect(0, 0, w, 28, 'F')
  doc.setTextColor('#ffffff')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('RELATÓRIO DE SERVIÇO', w / 2, 12, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pedido #${order.numeroPedido}  ·  ${order.nomeIgreja}`, w / 2, 21, { align: 'center' })
  doc.setTextColor(DARK)
  doc.setFontSize(8.5)
  const infoY = 35
  doc.text(
    `Bairro: ${order.bairroIdentificado ?? '—'}   Cidade: ${order.cidadeIdentificada ?? '—'}   Técnico: ${order.technicianName ?? '—'}`,
    14,
    infoY
  )
  doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, w - 14, infoY, {
    align: 'right',
  })
  doc.setDrawColor('#e2e8f0')
  doc.setLineWidth(0.4)
  doc.line(14, 39, w - 14, 39)
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  const w = pageWidth(doc)
  doc.setFillColor('#f1f5f9')
  doc.rect(14, y, w - 28, 8, 'F')
  doc.setTextColor(DARK)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(text.toUpperCase(), 17, y + 5.5)
  return y + 12
}

export async function generateRelatorioPDF(
  order: Order,
  relatorios: RelatorioEntry[],
  materiais: MaterialItem[]
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = pageWidth(doc)
  const marginLeft = 14
  const marginRight = w - 14
  const contentW = marginRight - marginLeft

  headerSection(doc, order)

  let y = 45

  // ── Materiais ─────────────────────────────────────────────────
  if (materiais.length > 0) {
    y = sectionTitle(doc, '1. Materiais Substituídos', y)

    for (const [idx, mat] of materiais.entries()) {
      y = ensureSpace(doc, y, 12)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK)
      doc.text(`${idx + 1}. ${mat.nome}`, marginLeft, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(GRAY)
      doc.text(`Qtd: ${mat.quantidade}`, marginLeft + 80, y)
      y += 6

      if (mat.justificativa) {
        y = ensureSpace(doc, y, 10)
        doc.setFontSize(8)
        const lines = doc.splitTextToSize(`Justificativa: ${mat.justificativa}`, contentW - 10)
        doc.text(lines, marginLeft + 4, y)
        y += lines.length * 5 + 2
      }

      if (mat.imagemAntigo || mat.imagemNovo) {
        y = ensureSpace(doc, y, 40)
        const imgW = (contentW - 10) / 2
        let imgH = 0

        if (mat.imagemAntigo) {
          doc.setFontSize(7)
          doc.setTextColor(GRAY)
          doc.text('ITEM ANTIGO', marginLeft + 4, y)
          const h = await addImageAsync(doc, mat.imagemAntigo, marginLeft + 4, y + 3, imgW, 32)
          imgH = Math.max(imgH, h + 3)
        }
        if (mat.imagemNovo) {
          doc.setFontSize(7)
          doc.setTextColor(GRAY)
          doc.text('ITEM NOVO', marginLeft + 4 + imgW + 6, y)
          const h = await addImageAsync(doc, mat.imagemNovo, marginLeft + 4 + imgW + 6, y + 3, imgW, 32)
          imgH = Math.max(imgH, h + 3)
        }
        y += imgH + 4
      }

      doc.setDrawColor('#f1f5f9')
      doc.setLineWidth(0.3)
      doc.line(marginLeft, y, marginRight, y)
      y += 5
    }
  }

  // ── Relatórios ────────────────────────────────────────────────
  if (relatorios.length > 0) {
    const sectionNum = materiais.length > 0 ? '2' : '1'
    y = ensureSpace(doc, y, 20)
    y = sectionTitle(doc, `${sectionNum}. Relatórios de Serviço`, y)

    for (const [idx, entry] of relatorios.entries()) {
      y = ensureSpace(doc, y, 16)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(DARK)
      doc.text(
        `Relatório ${idx + 1}  —  ${new Date(entry.criadoEm).toLocaleDateString('pt-BR')}`,
        marginLeft,
        y
      )
      y += 6

      if (entry.texto) {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(DARK)
        const lines = doc.splitTextToSize(entry.texto, contentW - 4)
        for (const line of lines) {
          y = ensureSpace(doc, y, 6)
          doc.text(line, marginLeft + 2, y)
          y += 5
        }
        y += 2
      }

      if (entry.imagens.length > 0) {
        const imgW = (contentW - 8) / 2
        const imgH = 45
        let col = 0

        for (const img of entry.imagens) {
          if (col === 0) y = ensureSpace(doc, y, imgH + 4)
          const x = marginLeft + col * (imgW + 6)
          await addImageAsync(doc, img, x, y, imgW, imgH)
          col++
          if (col >= 2) {
            col = 0
            y += imgH + 4
          }
        }
        if (col > 0) y += imgH + 4
      }

      doc.setDrawColor('#e2e8f0')
      doc.setLineWidth(0.3)
      doc.line(marginLeft, y, marginRight, y)
      y += 6
    }
  }

  // ── Footer ────────────────────────────────────────────────────
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const ph = pageHeight(doc)
    doc.setDrawColor('#e2e8f0')
    doc.setLineWidth(0.3)
    doc.line(marginLeft, ph - 12, marginRight, ph - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#94a3b8')
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}  ·  Pedido #${order.numeroPedido}`,
      marginLeft,
      ph - 7
    )
    doc.text(`${p} / ${totalPages}`, marginRight, ph - 7, { align: 'right' })
  }

  doc.save(`relatorio-pedido-${order.numeroPedido}.pdf`)
}
