import { useState } from 'react'
import { Plus, Trash2, Save, ImagePlus, X, Package } from 'lucide-react'
import type { MaterialItem } from '../../types'

interface MaterialTabProps {
  materiais: MaterialItem[]
  saving: boolean
  onSave: (materiais: MaterialItem[]) => Promise<void>
}

function newItem(): MaterialItem {
  return {
    id: crypto.randomUUID(),
    nome: '',
    quantidade: 1,
    imagemAntigo: null,
    imagemNovo: null,
    justificativa: '',
  }
}

function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
}) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChange((ev.target?.result as string) ?? null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-gray-600">{label}</span>
      {value ? (
        <div className="relative group w-full">
          <img
            src={value}
            alt={label}
            className="w-full h-28 object-cover rounded-xl border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-28 w-full border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-icm-red-400 hover:bg-red-50/30 transition-colors">
          <ImagePlus size={22} className="text-gray-400 mb-1" />
          <span className="text-xs text-gray-500">Clique para adicionar</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  )
}

export function MaterialTab({ materiais: initialMateriais, saving, onSave }: MaterialTabProps) {
  const [items, setItems] = useState<MaterialItem[]>(initialMateriais)
  const [dirty, setDirty] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function addItem() {
    const item = newItem()
    setItems((prev) => [...prev, item])
    setExpandedId(item.id)
    setDirty(true)
  }

  function removeItem(id: string) {
    if (!confirm('Deseja remover este item?')) return
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDirty(true)
  }

  function updateItem(id: string, field: keyof MaterialItem, value: unknown) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
    setDirty(true)
  }

  async function handleSave() {
    await onSave(items)
    setDirty(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Materiais Substituídos</h3>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} item(s) registrado(s)</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 px-4 py-2 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 transition-colors"
        >
          <Plus size={16} />
          Adicionar Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <Package className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500 text-sm">Nenhum material registrado</p>
          <p className="text-gray-400 text-xs mt-1">Clique em "Adicionar Item" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const isExpanded = expandedId === item.id
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-icm-red-100 text-icm-red-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {item.nome || 'Novo item'}
                      </p>
                      <p className="text-xs text-gray-500">Qtd: {item.quantidade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item.id)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded form */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Nome do item *
                        </label>
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => updateItem(item.id, 'nome', e.target.value)}
                          placeholder="Ex: Cabo HDMI, Projetor, Amplificador..."
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantidade *
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) =>
                            updateItem(item.id, 'quantidade', Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ImageUpload
                        label="Foto do item ANTIGO"
                        value={item.imagemAntigo}
                        onChange={(v) => updateItem(item.id, 'imagemAntigo', v)}
                      />
                      <ImageUpload
                        label="Foto do item NOVO"
                        value={item.imagemNovo}
                        onChange={(v) => updateItem(item.id, 'imagemNovo', v)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Justificativa da substituição
                      </label>
                      <textarea
                        value={item.justificativa}
                        onChange={(e) => updateItem(item.id, 'justificativa', e.target.value)}
                        placeholder="Descreva o motivo da substituição do item..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !dirty}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save size={16} />
        {saving ? 'Salvando...' : dirty ? 'Salvar Materiais' : 'Salvo'}
      </button>
    </div>
  )
}
