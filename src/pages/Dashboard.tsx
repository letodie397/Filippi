import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Users,
  Clock,
  AlertCircle,
  PlusCircle,
  ChevronRight,
} from 'lucide-react'
import { useOrderStats, useOrders } from '../hooks/useData'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  to,
}: {
  icon: typeof ClipboardList
  label: string
  value: number
  color: string
  to?: string
}) {
  const content = (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      {to && <ChevronRight className="text-gray-300 shrink-0" size={20} />}
    </div>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-icm-red-200 hover:shadow-md active:scale-[0.98] transition-all"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {content}
    </div>
  )
}

export function Dashboard() {
  const stats = useOrderStats()
  const orders = useOrders()

  const recentOrders = orders?.slice(0, 5) ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral dos pedidos e prestadores</p>
        </div>
        <Link to="/pedidos/novo">
          <Button>
            <PlusCircle size={18} />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ClipboardList}
            label="Total de Pedidos"
            value={stats.totalOrders}
            color="bg-icm-red-100 text-icm-red-700"
            to="/pedidos"
          />
          <StatCard
            icon={Clock}
            label="Pendentes"
            value={stats.pendingOrders}
            color="bg-yellow-100 text-yellow-700"
            to="/pedidos?status=pendente"
          />
          <StatCard
            icon={AlertCircle}
            label="Em Andamento"
            value={stats.activeOrders}
            color="bg-blue-100 text-blue-700"
            to="/pedidos?status=ativo"
          />
          <StatCard
            icon={Users}
            label="Prestadores"
            value={stats.totalTechnicians}
            color="bg-purple-100 text-purple-700"
            to="/prestadores"
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pedidos Recentes</h2>
          <Link to="/pedidos" className="text-sm text-icm-red-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">Nenhum pedido cadastrado ainda</p>
            <Link to="/pedidos/novo" className="inline-block mt-4">
              <Button variant="secondary" size="sm">
                Criar primeiro pedido
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to="/pedidos"
                className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    #{order.numeroPedido} — {order.nomeIgreja}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {order.bairroIdentificado && order.cidadeIdentificada
                      ? `${order.bairroIdentificado}, ${order.cidadeIdentificada}`
                      : 'Localização não identificada'}
                    {order.technicianName && ` • ${order.technicianName}`}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {stats && stats.totalTechnicians === 0 && (
        <div className="bg-icm-red-50 border border-icm-red-200 rounded-2xl p-6 flex items-start gap-4">
          <Users className="text-icm-red-600 shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="font-semibold text-icm-red-900">Cadastre prestadores de serviço</h3>
            <p className="text-sm text-icm-red-700 mt-1">
              Para que o sistema identifique conflitos de área, cadastre os técnicos e suas regiões de atendimento.
            </p>
            <Link to="/prestadores" className="inline-block mt-3">
              <Button size="sm">Cadastrar Prestador</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
