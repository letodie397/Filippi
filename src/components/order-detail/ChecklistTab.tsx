import { useState, useCallback } from 'react'
import { Save, FileDown, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { SignaturePad } from './SignaturePad'
import { generateChecklistPDF } from '../../utils/pdf-checklist'
import {
  CHECKLIST_STEPS,
  type OrderChecklist,
  type ChecklistItemData,
  type ChecklistKey,
  type Order,
} from '../../types'

function defaultChecklist(): OrderChecklist {
  const itens: ChecklistItemData[] = CHECKLIST_STEPS.flatMap((step) =>
    step.itens.map((item) => ({ key: item.key as ChecklistKey, resposta: null }))
  )
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

  function setResposta(key: ChecklistKey, resposta: 'sim' | 'nao') {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((item) => (item.key === key ? { ...item, resposta } : item)),
    }))
    setDirty(true)
  }

  function getResp(key: ChecklistKey): 'sim' | 'nao' | null {
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
  const allDone = respondidos === totalItens

  const stepProgress = useCallback(
    (stepIdx: number) => {
      const step = CHECKLIST_STEPS[stepIdx]
      const keys = step.itens.map((i) => i.key as ChecklistKey)
      const total = keys.length
      const done = keys.filter((k) => getResp(k) !== null).length
      const allSim = keys.every((k) => getResp(k) === 'sim')
      return { total, done, allSim, complete: done === total }
    },
    [form.itens] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso: {respondidos}/{totalItens} respondidos
          </span>
          <span className="text-sm text-gray-500">{simCount} SIM</span>
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
          Dados do Responsável
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo</label>
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

      {/* Steps */}
      {CHECKLIST_STEPS.map((step, stepIdx) => {
        const progress = stepProgress(stepIdx)
        return (
          <div key={step.passo} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {/* Step header */}
            <div
              className={`px-5 py-3.5 flex items-center justify-between border-b ${
                progress.complete && progress.allSim
                  ? 'bg-emerald-50 border-emerald-100'
                  : progress.complete
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {progress.complete && progress.allSim ? (
                  <CheckCircle2 size={17} className="text-emerald-600" />
                ) : progress.complete ? (
                  <AlertCircle size={17} className="text-amber-500" />
                ) : (
                  <Circle size={17} className="text-gray-400" />
                )}
                <span className="font-semibold text-sm text-gray-800">{step.titulo}</span>
              </div>
              <span className="text-xs text-gray-500">
                {progress.done}/{progress.total}
              </span>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {step.itens.map((item) => {
                const resp = getResp(item.key as ChecklistKey)
                return (
                  <div
                    key={item.key}
                    className="px-5 py-3.5 flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setResposta(item.key as ChecklistKey, 'sim')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          resp === 'sim'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setResposta(item.key as ChecklistKey, 'nao')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          resp === 'nao'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

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
