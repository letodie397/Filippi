import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, ImagePlus, X, Package, Loader2 } from 'lucide-react'
import { uploadImage, deleteImage } from '../../utils/upload-image'
import type { MaterialItem } from '../../types'

interface MaterialTabProps {
  orderId: string
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

type UploadingKey = `${string}-antigo` | `${string}-novo`

function ImageUpload({
  label,
  value,
  uploading,
  onFile,
  onRemove,
}: {
  label: string
  value: string | null
  uploading: boolean
  onFile: (file: File) => void
  onRemove: () => void
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-gray-600">{label}</span>
      {value ? (
        <div className="relative group w-full">
          <img
            src={value}
            alt={label}
            className="w-full h-28 object-cover rounded-xl border border-gray-200"
            loading="lazy"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center h-28 w-full border-2 border-dashed rounded-xl transition-colors ${
          uploading
            ? 'border-icm-red-300 bg-red-50/40 cursor-wait'
            : 'border-gray-300 cursor-pointer hover:border-icm-red-400 hover:bg-red-50/30'
        }`}>
          {uploading ? (
            <>
              <Loader2 size={20} className="text-icm-red-500 animate-spin mb-1" />
              <span className="text-xs text-icm-red-500">Enviando...</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} className="text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Clique para adicionar</span>
            </>
          )}
          {!uploading && (
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
                e.target.value = ''
              }}
            />
          )}
        </label>
      )}
    </div>
  )
}

export function MaterialTab({ orderId, materiais: initialMateriais, saving, onSave }: MaterialTabProps) {
  const [items, setItems] = useState<MaterialItem[]>(initialMateriais)
  const [dirty, setDirty] = useState(false)

  // Sincroniza quando os dados chegam do Firebase pela primeira vez
  useEffect(() => {
    if (!dirty) setItems(initialMateriais)
  }, [initialMateriais]) // eslint-disable-line react-hooks/exhaustive-deps
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<Set<UploadingKey>>(new Set())
  const [uploadError, setUploadError] = useState<string | null>(null)

  function addItem() {
    const item = newItem()
    setItems((prev) => [...prev, item])
    setExpandedId(item.id)
    setDirty(true)
  }

  async function removeItem(id: string) {
    if (!confirm('Deseja remover este item?')) return
    const item = items.find((i) => i.id === id)
    if (item) {
      if (item.imagemAntigo) deleteImage(item.imagemAntigo).catch(console.warn)
      if (item.imagemNovo) deleteImage(item.imagemNovo).catch(console.warn)
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDirty(true)
  }

  function updateItem(id: string, field: keyof MaterialItem, value: unknown) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
    setDirty(true)
  }

  async function handleImageUpload(
    itemId: string,
    field: 'imagemAntigo' | 'imagemNovo',
    file: File
  ) {
    const key: UploadingKey = `${itemId}-${field === 'imagemAntigo' ? 'antigo' : 'novo'}`
    setUploading((prev) => new Set(prev).add(key))
    setUploadError(null)
    try {
      const context = field === 'imagemAntigo' ? 'material-antigo' : 'material-novo'
      const url = await uploadImage(file, orderId, context)
      updateItem(itemId, field, url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar imagem')
    } finally {
      setUploading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function handleImageRemove(itemId: string, field: 'imagemAntigo' | 'imagemNovo') {
    const item = items.find((i) => i.id === itemId)
    const url = item?.[field]
    if (url) deleteImage(url).catch(console.warn)
    updateItem(itemId, field, null)
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

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-2 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

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
            const upAntigo = uploading.has(`${item.id}-antigo`)
            const upNovo = uploading.has(`${item.id}-novo`)
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
                        uploading={upAntigo}
                        onFile={(f) => handleImageUpload(item.id, 'imagemAntigo', f)}
                        onRemove={() => handleImageRemove(item.id, 'imagemAntigo')}
                      />
                      <ImageUpload
                        label="Foto do item NOVO"
                        value={item.imagemNovo}
                        uploading={upNovo}
                        onFile={(f) => handleImageUpload(item.id, 'imagemNovo', f)}
                        onRemove={() => handleImageRemove(item.id, 'imagemNovo')}
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
        disabled={saving || !dirty || uploading.size > 0}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading.size > 0 ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Aguardando uploads...
          </>
        ) : (
          <>
            <Save size={16} />
            {saving ? 'Salvando...' : dirty ? 'Salvar Materiais' : 'Salvo'}
          </>
        )}
      </button>
    </div>
  )
}
