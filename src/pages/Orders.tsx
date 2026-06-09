import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, MapPin, Trash2, Filter } from 'lucide-react'
import { useOrders, deleteOrder, updateOrder } from '../hooks/useData'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import type { OrderStatus } from '../types'

type StatusFilter = OrderStatus | '' | 'ativo'

export function Orders() {
  const orders = useOrders()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')

  useEffect(() => {
    const status = searchParams.get('status')
    if (
      status === 'pendente' ||
      status === 'confirmado' ||
      status === 'em_andamento' ||
      status === 'concluido' ||
      status === 'cancelado' ||
      status === 'ativo'
    ) {
      setStatusFilter(status)
    }
  }, [searchParams])

  const filtered = (orders ?? []).filter((order) => {
    const matchSearch =
      !search ||
      order.numeroPedido.toLowerCase().includes(search.toLowerCase()) ||
      order.nomeIgreja.toLowerCase().includes(search.toLowerCase()) ||
      order.bairroIdentificado?.toLowerCase().includes(search.toLowerCase()) ||
      order.cidadeIdentificada?.toLowerCase().includes(search.toLowerCase())

    const matchStatus =
      !statusFilter ||
      (statusFilter === 'ativo'
        ? order.status === 'confirmado' || order.status === 'em_andamento'
        : order.status === statusFilter)

    return matchSearch && matchStatus
  })

  async function handleDelete(id: string) {
    if (confirm('Deseja excluir este pedido?')) {
      await deleteOrder(id)
    }
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    await updateOrder(id, { status })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 mt-1">Lista de todos os pedidos cadastrados</p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <Plus size={18} />
            Novo Pedido
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por número, igreja, bairro ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-icm-red-500 focus:border-icm-red-500"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'pendente', label: 'Pendente' },
              { value: 'ativo', label: 'Em andamento (confirmado + ativo)' },
              { value: 'confirmado', label: 'Confirmado' },
              { value: 'em_andamento', label: 'Em andamento' },
              { value: 'concluido', label: 'Concluído' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
            placeholder="Todos os status"
          />
        </div>
      </div>

      {!orders || filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Filter className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="font-semibold text-gray-900">
            {search || statusFilter ? 'Nenhum pedido encontrado' : 'Nenhum pedido cadastrado'}
          </h3>
          <p className="text-gray-500 mt-2 text-sm">
            {search || statusFilter
              ? 'Tente alterar os filtros de busca'
              : 'Comece cadastrando um novo pedido'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Pedido</th>
                  <th className="px-6 py-3">Igreja</th>
                  <th className="px-6 py-3">Localização</th>
                  <th className="px-6 py-3">Técnico</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-icm-red-700">#{order.numeroPedido}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">
                      {order.nomeIgreja}
                    </td>
                    <td className="px-6 py-4">
                      {order.bairroIdentificado || order.cidadeIdentificada ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate">
                            {[order.bairroIdentificado, order.cidadeIdentificada]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Não identificada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.technicianName ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className="text-xs border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-0 p-0"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
