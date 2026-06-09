import { useState } from 'react'
import { Plus, Phone, Mail, MapPin, Trash2, Edit2 } from 'lucide-react'
import {
  useTechnicians,
  addTechnician,
  updateTechnician,
  deleteTechnician,
} from '../hooks/useData'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import { Modal } from '../components/ui/Modal'
import { getCidadesUnicas, getCidadesComBairros, getBairrosByCidade, ESTADO_ES } from '../data/es-locations'
import type { Technician, ServiceArea, AreaType } from '../types'

const CUSTOM_BAIRRO = '__custom__'

interface AreaForm {
  type: AreaType
  cidade: string
  bairro: string
  bairroCustom: string
}

const emptyArea: AreaForm = { type: 'bairro', cidade: '', bairro: '', bairroCustom: '' }

export function Technicians() {
  const technicians = useTechnicians()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Technician | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [areas, setAreas] = useState<AreaForm[]>([{ ...emptyArea }])
  const [saving, setSaving] = useState(false)

  const cidadesTodas = getCidadesUnicas()
  const cidadesComBairros = getCidadesComBairros()

  function openCreate() {
    setEditing(null)
    setName('')
    setPhone('')
    setEmail('')
    setAreas([{ ...emptyArea }])
    setModalOpen(true)
  }

  function openEdit(tech: Technician) {
    setEditing(tech)
    setName(tech.name)
    setPhone(tech.phone)
    setEmail(tech.email ?? '')
    setAreas(
      tech.areas.length > 0
        ? tech.areas.map((a) => ({
            type: a.type,
            cidade: a.cidade,
            bairro: a.bairro ?? '',
            bairroCustom: '',
          }))
        : [{ ...emptyArea }]
    )
    setModalOpen(true)
  }

  function addArea() {
    setAreas([...areas, { ...emptyArea }])
  }

  function removeArea(index: number) {
    setAreas(areas.filter((_, i) => i !== index))
  }

  function updateArea(index: number, field: keyof AreaForm, value: string) {
    const updated = [...areas]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'cidade') {
      updated[index].bairro = ''
      updated[index].bairroCustom = ''
    }
    if (field === 'type' && value === 'estado') {
      updated[index].cidade = ESTADO_ES
      updated[index].bairro = ''
      updated[index].bairroCustom = ''
    }
    setAreas(updated)
  }

  async function handleSave() {
    if (!name.trim() || !phone.trim()) return

    const validAreas = areas
      .filter((a) => {
        if (a.type === 'estado') return true
        if (a.type === 'cidade') return a.cidade
        const bairroFinal = a.bairro === CUSTOM_BAIRRO ? a.bairroCustom.trim() : a.bairro
        return a.cidade && bairroFinal
      })
      .map((a) => {
        const bairroFinal =
          a.type === 'bairro'
            ? a.bairro === CUSTOM_BAIRRO
              ? a.bairroCustom.trim()
              : a.bairro
            : undefined
        return {
          type: a.type,
          cidade: a.type === 'estado' ? ESTADO_ES : a.cidade,
          bairro: bairroFinal,
        }
      })

    if (validAreas.length === 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateTechnician(editing.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          areas: validAreas.map((a) => ({
            ...a,
            id: crypto.randomUUID(),
          })) as ServiceArea[],
        })
      } else {
        await addTechnician({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          areas: validAreas,
        })
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Deseja excluir este prestador?')) {
      await deleteTechnician(id)
    }
  }

  function formatArea(area: ServiceArea): string {
    if (area.type === 'estado') return 'Todo o Espírito Santo'
    if (area.type === 'cidade') return area.cidade
    return `${area.bairro}, ${area.cidade}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prestadores de Serviço</h1>
          <p className="text-gray-500 mt-1">Gerencie técnicos e suas áreas de atendimento</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Novo Prestador
        </Button>
      </div>

      {!technicians || technicians.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="font-semibold text-gray-900">Nenhum prestador cadastrado</h3>
          <p className="text-gray-500 mt-2 text-sm">
            Cadastre os técnicos e defina as regiões, cidades ou bairros que cada um atende.
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus size={18} />
            Cadastrar Prestador
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-icm-red-100 rounded-xl flex items-center justify-center text-icm-red-700 font-bold text-lg">
                  {tech.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(tech)}
                    className="p-2 rounded-lg text-gray-400 hover:text-icm-red-700 hover:bg-icm-red-50"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(tech.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg">{tech.name}</h3>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {tech.phone}
                </div>
                {tech.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    {tech.email}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Áreas de atendimento
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tech.areas.map((area) => (
                    <span
                      key={area.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-icm-red-50 text-icm-red-800 rounded-lg text-xs font-medium"
                    >
                      <MapPin size={12} />
                      {formatArea(area)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Prestador' : 'Novo Prestador'}
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do técnico"
              required
            />
            <Input
              label="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(27) 99999-9999"
              required
            />
          </div>
          <Input
            label="E-mail (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Áreas de Atendimento</label>
              <Button variant="ghost" size="sm" onClick={addArea}>
                <Plus size={14} />
                Adicionar área
              </Button>
            </div>

            <div className="space-y-3">
              {areas.map((area, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-xl"
                >
                  <Select
                    label="Tipo"
                    value={area.type}
                    onChange={(e) => updateArea(index, 'type', e.target.value)}
                    options={[
                      { value: 'bairro', label: 'Bairro específico' },
                      { value: 'cidade', label: 'Cidade inteira' },
                      { value: 'estado', label: 'Todo o estado (ES)' },
                    ]}
                    className="sm:w-44"
                  />

                  {area.type !== 'estado' && (
                    <Select
                      id={`cidade-${index}`}
                      label="Cidade"
                      value={area.cidade}
                      onChange={(e) => updateArea(index, 'cidade', e.target.value)}
                      options={(area.type === 'bairro' ? cidadesComBairros : cidadesTodas).map(
                        (c) => ({ value: c, label: c })
                      )}
                      placeholder="Selecione a cidade"
                      className="flex-1"
                    />
                  )}

                  {area.type === 'bairro' && area.cidade && (
                    <>
                      <SearchableSelect
                        id={`bairro-${index}`}
                        label={`Bairro (${getBairrosByCidade(area.cidade).length} disponíveis)`}
                        value={area.bairro}
                        onChange={(val) => updateArea(index, 'bairro', val)}
                        options={[
                          ...getBairrosByCidade(area.cidade).map((b) => ({
                            value: b.nome,
                            label: b.nome,
                          })),
                          { value: CUSTOM_BAIRRO, label: 'Outro (digitar nome)' },
                        ]}
                        placeholder="Buscar bairro..."
                      />
                      {area.bairro === CUSTOM_BAIRRO && (
                        <Input
                          id={`bairro-custom-${index}`}
                          label="Nome do bairro"
                          value={area.bairroCustom}
                          onChange={(e) => updateArea(index, 'bairroCustom', e.target.value)}
                          placeholder="Digite o nome do bairro"
                          className="flex-1"
                        />
                      )}
                    </>
                  )}

                  {areas.length > 1 && (
                    <button
                      onClick={() => removeArea(index)}
                      className="self-end p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
