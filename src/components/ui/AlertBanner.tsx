import { AlertTriangle, Info, XCircle, CheckCircle2 } from 'lucide-react'
import type { ConflictAlert } from '../../types'

interface AlertBannerProps {
  alert: ConflictAlert
  selectedTechnicianId?: string
  onUseTechnician?: (technicianId: string) => void
}

const config = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
}

function useTechnicianLabel(alert: ConflictAlert): string {
  if (
    alert.type === 'pedido_raio' ||
    alert.type === 'pedido_proximo' ||
    alert.type === 'pedido_mesmo_bairro'
  ) {
    return `Usar técnico do pedido: ${alert.technicianName}`
  }
  return `Usar técnico: ${alert.technicianName}`
}

export function AlertBanner({ alert, selectedTechnicianId, onUseTechnician }: AlertBannerProps) {
  const { icon: Icon, bg, text, iconColor } = config[alert.severity]
  const showUseButton =
    alert.technicianId &&
    alert.technicianName &&
    onUseTechnician &&
    selectedTechnicianId !== alert.technicianId

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${bg}`}>
      <Icon className={`shrink-0 mt-0.5 ${iconColor}`} size={20} />
      <div className="space-y-2 min-w-0 flex-1">
        <p className={`text-sm ${text}`}>{alert.message}</p>
        {alert.orderNumero && alert.orderIgreja && (
          <p className={`text-xs ${text} opacity-75`}>
            Pedido relacionado: #{alert.orderNumero} — {alert.orderIgreja}
            {alert.technicianName && ` • Técnico: ${alert.technicianName}`}
          </p>
        )}
        {showUseButton && (
          <button
            type="button"
            onClick={() => onUseTechnician(alert.technicianId!)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px] ${
              alert.severity === 'error'
                ? 'bg-white/80 border-red-300 text-red-800 active:bg-white'
                : alert.severity === 'warning'
                  ? 'bg-white/80 border-amber-300 text-amber-900 active:bg-white'
                  : 'bg-white/80 border-blue-300 text-blue-900 active:bg-white'
            }`}
          >
            <CheckCircle2 size={14} />
            {useTechnicianLabel(alert)}
          </button>
        )}
      </div>
    </div>
  )
}
