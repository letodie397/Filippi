import { useState } from 'react'
import { Plus, Trash2, Save, ImagePlus, X, FileDown, FileText, Loader2 } from 'lucide-react'
import { uploadImage, deleteImage } from '../../utils/upload-image'
import { generateRelatorioPDF } from '../../utils/pdf-relatorio'
import type { RelatorioEntry, MaterialItem, Order } from '../../types'

interface RelatorioTabProps {
  order: Order
  relatorios: RelatorioEntry[]
  materiais: MaterialItem[]
  saving: boolean
  onSave: (relatorios: RelatorioEntry[]) => Promise<void>
}

function newEntry(): RelatorioEntry {
  return {
    id: crypto.randomUUID(),
    texto: '',
    imagens: [],
    criadoEm: new Date().toISOString(),
  }
}

export function RelatorioTab({ order, relatorios: initialRelatorios, materiais, saving, onSave }: RelatorioTabProps) {
  const [entries, setEntries] = useState<RelatorioEntry[]>(initialRelatorios)
  const [dirty, setDirty] = useState(false)
  const [uploadingEntries, setUploadingEntries] = useState<Set<string>>(new Set())
  const [uploadError, setUploadError] = useState<string | null>(null)

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()])
    setDirty(true)
  }

  async function removeEntry(id: string) {
    if (!confirm('Deseja remover este relatório?')) return
    const entry = entries.find((e) => e.id === id)
    if (entry) {
      entry.imagens.forEach((url) => deleteImage(url).catch(console.warn))
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setDirty(true)
  }

  function updateTexto(id: string, texto: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, texto } : e)))
    setDirty(true)
  }

  async function handleAddImages(entryId: string, files: File[]) {
    setUploadingEntries((prev) => new Set(prev).add(entryId))
    setUploadError(null)
    try {
      const urls = await Promise.all(
        files.map((f) => uploadImage(f, order.id, 'relatorio'))
      )
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, imagens: [...e.imagens, ...urls] } : e
        )
      )
      setDirty(true)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar imagem')
    } finally {
      setUploadingEntries((prev) => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }
  }

  function removeImagem(entryId: string, imgIdx: number) {
    const entry = entries.find((e) => e.id === entryId)
    const url = entry?.imagens[imgIdx]
    if (url) deleteImage(url).catch(console.warn)
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, imagens: e.imagens.filter((_, i) => i !== imgIdx) } : e
      )
    )
    setDirty(true)
  }

  async function handleSave() {
    await onSave(entries)
    setDirty(false)
  }

  async function handleGeneratePDF() {
    await generateRelatorioPDF(order, entries, materiais)
  }

  const anyUploading = uploadingEntries.size > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Relatórios de Serviço</h3>
          <p className="text-xs text-gray-500 mt-0.5">{entries.length} entrada(s) registrada(s)</p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-1.5 px-4 py-2 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 transition-colors"
        >
          <Plus size={16} />
          Adicionar Relatório
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

      {entries.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <FileText className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500 text-sm">Nenhum relatório registrado</p>
          <p className="text-gray-400 text-xs mt-1">Clique em "Adicionar Relatório" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const isUploading = uploadingEntries.has(entry.id)
            return (
              <div
                key={entry.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 py-3.5 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-icm-red-100 text-icm-red-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Relatório #{idx + 1}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Descrição do serviço
                    </label>
                    <textarea
                      value={entry.texto}
                      onChange={(e) => updateTexto(entry.id, e.target.value)}
                      placeholder="Cole ou escreva o relatório do serviço realizado..."
                      rows={6}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500 resize-none"
                    />
                  </div>

                  {/* Images */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Imagens do relatório ({entry.imagens.length})
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {entry.imagens.map((img, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          <img
                            src={img}
                            alt={`Imagem ${imgIdx + 1}`}
                            className="w-full h-24 object-cover rounded-xl border border-gray-200"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => removeImagem(entry.id, imgIdx)}
                            className="absolute top-1 right-1 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}

                      {/* Add image button */}
                      <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl transition-colors ${
                        isUploading
                          ? 'border-icm-red-300 bg-red-50/40 cursor-wait'
                          : 'border-gray-300 cursor-pointer hover:border-icm-red-400 hover:bg-red-50/30'
                      }`}>
                        {isUploading ? (
                          <>
                            <Loader2 size={18} className="text-icm-red-500 animate-spin mb-1" />
                            <span className="text-xs text-icm-red-500">Enviando...</span>
                          </>
                        ) : (
                          <>
                            <ImagePlus size={20} className="text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Adicionar</span>
                          </>
                        )}
                        {!isUploading && (
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? [])
                              if (files.length) handleAddImages(entry.id, files)
                              e.target.value = ''
                            }}
                          />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty || anyUploading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-icm-red-600 text-white rounded-xl text-sm font-semibold hover:bg-icm-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {anyUploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Aguardando uploads...
            </>
          ) : (
            <>
              <Save size={16} />
              {saving ? 'Salvando...' : dirty ? 'Salvar Relatórios' : 'Salvo'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleGeneratePDF}
          disabled={entries.length === 0}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FileDown size={16} />
          Gerar PDF do Relatório
        </button>
      </div>
    </div>
  )
}
