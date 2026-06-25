import { useState } from 'react'
import { Save, FileDown, CheckCircle2 } from 'lucide-react'
import { SignaturePad } from './SignaturePad'
import { generateChecklistPDF } from '../../utils/pdf-checklist'
import {
  CHECKLIST_ITENS,
  type OrderChecklist,
  type ChecklistItemData,
  type ChecklistKey,
  type Order,
} from '../../types'

function defaultChecklist(): OrderChecklist {
  const itens: ChecklistItemData[] = CHECKLIST_ITENS.map((item) => ({
    key: item.key as ChecklistKey,
    resposta: null,
  }))
  return {
    responsavel: { nome: '', telefone: '', cpf: '', assinatura: '' },
    itens,
  }
}

interface ChecklistTabProps {
  order: Order
  checklist: OrderChecklist | undefined
  saving: boolean
  onSave: (checklist: OrderChecklist) => Promise<void>
}

export function ChecklistTab({ order, checklist, saving, onSave }: ChecklistTabProps) {
  const [form, setForm] = useState<OrderChecklist>(() => checklist ?? defaultChecklist())
  const [dirty, setDirty] = useState(false)

  function updateResponsavel(field: keyof OrderChecklist['responsavel'], value: string) {
    setForm((prev) => ({
      ...prev,
      responsavel: { ...prev.responsavel, [field]: value },
    }))
    setDirty(true)
  }

  function setResposta(key: ChecklistKey, resposta: 'sim' | 'nao' | 'na') {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((item) => (item.key === key ? { ...item, resposta } : item)),
    }))
    setDirty(true)
  }

  function getResp(key: ChecklistKey): 'sim' | 'nao' | 'na' | null {
    return form.itens.find((i) => i.key === key)?.resposta ?? null
  }

  async function handleSave() {
    const updated: OrderChecklist = {
      ...form,
      atualizadoEm: new Date().toISOString(),
    }
    await onSave(updated)
    setDirty(false)
  }

  async function handleGeneratePDF() {
    await generateChecklistPDF(order, form)
  }

  const totalItens = form.itens.length
  const respondidos = form.itens.filter((i) => i.resposta !== null).length
  const simCount = form.itens.filter((i) => i.resposta === 'sim').length
  const naoCount = form.itens.filter((i) => i.resposta === 'nao').length
  const naCount = form.itens.filter((i) => i.resposta === 'na').length
  const allDone = respondidos === totalItens

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso: {respondidos}/{totalItens}
          </span>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="text-emerald-600 font-semibold">{simCount} SIM</span>
            <span className="text-red-500 font-semibold">{naoCount} NÃO</span>
            <span className="text-gray-400 font-semibold">{naCount} N/A</span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-icm-red-600 rounded-full transition-all"
            style={{ width: `${(respondidos / totalItens) * 100}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-2 flex items-center gap-1.5 text-emerald-600 text-sm">
            <CheckCircle2 size={15} />
            Checklist completo
          </div>
        )}
      </div>

      {/* Responsável */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
          Informações do Responsável
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome / Aprovado por</label>
            <input
              type="text"
              value={form.responsavel.nome}
              onChange={(e) => updateResponsavel('nome', e.target.value)}
              placeholder="Nome do responsável"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
            <input
              type="tel"
              value={form.responsavel.telefone}
              onChange={(e) => updateResponsavel('telefone', e.target.value)}
              placeholder="(27) 99999-9999"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
            <input
              type="text"
              value={form.responsavel.cpf}
              onChange={(e) => updateResponsavel('cpf', e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Assinatura digital
          </label>
          <SignaturePad
            value={form.responsavel.assinatura}
            onChange={(val) => updateResponsavel('assinatura', val)}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Itens do Checklist</h3>
          <p className="text-xs text-gray-500 mt-0.5">Responda SIM, NÃO ou N/A para cada item</p>
        </div>
        <div className="divide-y divide-gray-50">
          {CHECKLIST_ITENS.map((item, idx) => {
            const resp = getResp(item.key as ChecklistKey)
            return (
              <div
                key={item.key}
                className={`px-5 py-3.5 flex items-start sm:items-center justify-between gap-4 ${
                  resp === 'nao' ? 'bg-red-50/40' : resp === 'sim' ? 'bg-emerald-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 leading-snug">{item.label}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(['sim', 'nao', 'na'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setResposta(item.key as ChecklistKey, opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        resp === opt
                          ? opt === 'sim'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : opt === 'nao'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-gray-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {opt === 'sim' ? 'SIM' : opt === 'nao' ? 'NÃO' : 'N/A'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : dirty ? 'Salvar Checklist' : 'Salvo'}
        </button>
        <button
          type="button"
          onClick={handleGeneratePDF}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <FileDown size={16} />
          Gerar PDF do Checklist
        </button>
      </div>
    </div>
  )
}
