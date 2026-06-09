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
    <>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {to && <ChevronRight className="text-gray-300" size={18} />}
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </>
  )

  const className =
    'block bg-white rounded-xl p-4 lg:p-5 border border-gray-100 shadow-sm hover:border-icm-red-200 hover:shadow-md transition-all'

  if (to) {
    return (
      <Link to={to} className={`${className} active:scale-[0.98]`}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

export function Dashboard() {
  const stats = useOrderStats()
  const orders = useOrders()

  const recentOrders = orders?.slice(0, 5) ?? []

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Visão geral dos pedidos e prestadores</p>
        </div>
        <Link to="/pedidos/novo" className="shrink-0">
          <Button>
            <PlusCircle size={18} />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pedidos Recentes</h2>
          <Link to="/pedidos" className="text-sm text-icm-red-700 hover:underline">
            Ver todos
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 text-sm">Nenhum pedido cadastrado ainda</p>
            <Link to="/pedidos/novo" className="inline-block mt-3">
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
                className="px-4 lg:px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm lg:text-base">
                    #{order.numeroPedido} — {order.nomeIgreja}
                  </p>
                  <p className="text-xs lg:text-sm text-gray-500 truncate mt-0.5">
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
        <div className="bg-icm-red-50 border border-icm-red-200 rounded-xl p-5 flex items-start gap-3">
          <Users className="text-icm-red-600 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-semibold text-icm-red-900 text-sm lg:text-base">
              Cadastre prestadores de serviço
            </h3>
            <p className="text-sm text-icm-red-700 mt-1">
              Para que o sistema identifique conflitos de área, cadastre os técnicos e suas regiões
              de atendimento.
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
