import { jsPDF } from 'jspdf'
import { addImageAsync } from './pdf-image'
import { CHECKLIST_ITENS, type OrderChecklist, type Order, type ChecklistKey } from '../types'

const RED = '#c0392b'
const DARK = '#1e293b'
const GRAY = '#64748b'
const GREEN = '#16a34a'
const RED_RESP = '#dc2626'
const GRAY_NA = '#94a3b8'

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth()
}

function pageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight()
}

function headerSection(doc: jsPDF, order: Order) {
  const w = pageWidth(doc)

  // Red header band
  doc.setFillColor(RED)
  doc.rect(0, 0, w, 28, 'F')

  doc.setTextColor('#ffffff')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('CHECKLIST DE SERVIÇO', w / 2, 12, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pedido #${order.numeroPedido}  ·  ${order.nomeIgreja}`, w / 2, 21, { align: 'center' })

  // Info row below header
  doc.setTextColor(DARK)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const infoY = 35
  doc.text(
    `Bairro: ${order.bairroIdentificado ?? '—'}   Cidade: ${order.cidadeIdentificada ?? '—'}   Técnico: ${order.technicianName ?? '—'}`,
    14,
    infoY
  )
  doc.text(
    `Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`,
    w - 14,
    infoY,
    { align: 'right' }
  )

  // Horizontal rule
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

export async function generateChecklistPDF(order: Order, checklist: OrderChecklist): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = pageWidth(doc)
  const marginLeft = 14
  const marginRight = w - 14
  const contentW = marginRight - marginLeft

  headerSection(doc, order)

  let y = 45

  // ── Responsável ───────────────────────────────────────────────
  y = sectionTitle(doc, '1. Dados do Responsável', y)

  const resp = checklist.responsavel
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(GRAY)

  const fields = [
    { label: 'Nome:', value: resp.nome || '—' },
    { label: 'Telefone:', value: resp.telefone || '—' },
    { label: 'CPF:', value: resp.cpf || '—' },
  ]
  fields.forEach((f, i) => {
    const col = i < 2 ? 0 : 0
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK)
    doc.text(f.label, marginLeft + col, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(GRAY)
    doc.text(f.value, marginLeft + col + 18, y)
    y += 6
  })

  // Assinatura
  if (resp.assinatura) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(DARK)
    doc.text('Assinatura:', marginLeft, y)
    y += 4
    const sigH = await addImageAsync(doc, resp.assinatura, marginLeft, y, contentW * 0.5, 25)
    y += sigH + 6
  } else {
    y += 4
    doc.setFontSize(8)
    doc.setTextColor('#94a3b8')
    doc.text('(sem assinatura registrada)', marginLeft, y)
    y += 8
  }

  doc.setDrawColor('#e2e8f0')
  doc.line(marginLeft, y, marginRight, y)
  y += 6

  // ── Checklist ─────────────────────────────────────────────────
  y = sectionTitle(doc, '2. Itens do Checklist', y)

  CHECKLIST_ITENS.forEach((item, idx) => {
    if (y > pageHeight(doc) - 18) {
      doc.addPage()
      y = 20
    }

    const resposta = checklist.itens.find((i) => i.key === item.key as ChecklistKey)?.resposta ?? null
    const badgeText = resposta === 'sim' ? 'SIM' : resposta === 'nao' ? 'NÃO' : resposta === 'na' ? 'N/A' : 'N/R'
    const badgeColor = resposta === 'sim' ? GREEN : resposta === 'nao' ? RED_RESP : GRAY_NA

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(DARK)
    doc.setFontSize(8)

    const numText = `${idx + 1}.`
    const lineText = `${item.label}`
    const lines = doc.splitTextToSize(lineText, contentW - 30)

    doc.setFont('helvetica', 'bold')
    doc.text(numText, marginLeft + 2, y)
    doc.setFont('helvetica', 'normal')
    lines.forEach((line: string, li: number) => {
      doc.text(line, marginLeft + 9, y + li * 5)
    })

    const badgeX = marginRight - 18
    const badgeY = y - 4
    doc.setFillColor(badgeColor)
    doc.roundedRect(badgeX, badgeY, 16, 6, 1.5, 1.5, 'F')
    doc.setTextColor('#ffffff')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text(badgeText, badgeX + 8, badgeY + 4, { align: 'center' })

    y += lines.length * 5 + 3
  })

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

  doc.save(`checklist-pedido-${order.numeroPedido}.pdf`)
}
