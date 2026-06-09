import type { OrderStatus } from '../../types'

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  confirmado: { label: 'Confirmado', className: 'bg-blue-100 text-blue-800' },
  em_andamento: { label: 'Em andamento', className: 'bg-purple-100 text-purple-800' },
  concluido: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-100 text-gray-600' },
}

interface BadgeProps {
  status: OrderStatus
}

export function StatusBadge({ status }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

interface ConfidenceBadgeProps {
  confidence: 'alta' | 'media' | 'baixa'
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const config = {
    alta: { label: 'Alta confiança', className: 'bg-green-100 text-green-800' },
    media: { label: 'Média confiança', className: 'bg-yellow-100 text-yellow-800' },
    baixa: { label: 'Baixa confiança', className: 'bg-orange-100 text-orange-800' },
  }[confidence]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
