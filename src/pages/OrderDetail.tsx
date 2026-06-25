import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Wrench, FileText, MapPin, User, AlertCircle } from 'lucide-react'
import { useOrders } from '../hooks/useData'
import { useServiceData } from '../hooks/useServiceData'
import { StatusBadge } from '../components/ui/Badge'
import { ChecklistTab } from '../components/order-detail/ChecklistTab'
import { MaterialTab } from '../components/order-detail/MaterialTab'
import { RelatorioTab } from '../components/order-detail/RelatorioTab'
import type { OrderChecklist, MaterialItem, RelatorioEntry, OrderServiceData } from '../types'

type TabId = 'checklist' | 'material' | 'relatorio'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'checklist', label: 'Checklist', icon: <ClipboardCheck size={16} /> },
  { id: 'material', label: 'Material', icon: <Wrench size={16} /> },
  { id: 'relatorio', label: 'Relatório', icon: <FileText size={16} /> },
]

export function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const orders = useOrders()
  const { data: serviceData, loading, saving, error, save } = useServiceData(id)
  const [activeTab, setActiveTab] = useState<TabId>('checklist')

  const order = orders?.find((o) => o.id === id)

  if (!orders) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-icm-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link to="/pedidos" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Voltar para pedidos
        </Link>
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <AlertCircle className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-600 font-semibold">Pedido não encontrado</p>
        </div>
      </div>
    )
  }

  async function handleSaveChecklist(checklist: OrderChecklist) {
    const updated: OrderServiceData = {
      ...(serviceData ?? {}),
      checklist,
    }
    await save(updated)
  }

  async function handleSaveMateriais(materiais: MaterialItem[]) {
    const updated: OrderServiceData = {
      ...(serviceData ?? {}),
      materiais,
    }
    await save(updated)
  }

  async function handleSaveRelatorios(relatorios: RelatorioEntry[]) {
    const updated: OrderServiceData = {
      ...(serviceData ?? {}),
      relatorios,
    }
    await save(updated)
  }

  return (
    <div className="space-y-5">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          to="/pedidos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={15} />
          Pedidos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">#{order.numeroPedido}</span>
      </div>

      {/* Order summary card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-icm-red-700 to-icm-red-600 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-icm-red-200 text-xs font-medium mb-0.5">
                Pedido #{order.numeroPedido}
              </p>
              <h1 className="text-white text-lg font-bold leading-tight">{order.nomeIgreja}</h1>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {(order.bairroIdentificado || order.cidadeIdentificada) && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={15} className="text-gray-400 shrink-0" />
              <span>
                {[order.bairroIdentificado, order.cidadeIdentificada].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {order.technicianName && (
            <div className="flex items-center gap-2 text-gray-600">
              <User size={15} className="text-gray-400 shrink-0" />
              <span>{order.technicianName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-xs">
              Criado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-icm-red-600 text-icm-red-700 bg-red-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-icm-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'checklist' && (
                <ChecklistTab
                  order={order}
                  checklist={serviceData?.checklist}
                  saving={saving}
                  onSave={handleSaveChecklist}
                />
              )}
              {activeTab === 'material' && (
                <MaterialTab
                  materiais={serviceData?.materiais ?? []}
                  saving={saving}
                  onSave={handleSaveMateriais}
                />
              )}
              {activeTab === 'relatorio' && (
                <RelatorioTab
                  order={order}
                  relatorios={serviceData?.relatorios ?? []}
                  materiais={serviceData?.materiais ?? []}
                  saving={saving}
                  onSave={handleSaveRelatorios}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
