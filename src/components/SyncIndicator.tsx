import { Cloud, CloudOff, Loader2, AlertTriangle } from 'lucide-react'
import { useSyncStatus } from '../hooks/useData'
import type { SyncStatus } from '../types'

const config: Record<
  SyncStatus,
  { icon: typeof Cloud; label: string; className: string }
> = {
  loading: {
    icon: Loader2,
    label: 'Sincronizando',
    className: 'text-gray-400',
  },
  connected: {
    icon: Cloud,
    label: 'Sincronizado',
    className: 'text-emerald-500',
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    className: 'text-amber-500',
  },
  error: {
    icon: AlertTriangle,
    label: 'Erro de sync',
    className: 'text-red-500',
  },
}

interface SyncIndicatorProps {
  inverted?: boolean
}

export function SyncIndicator({ inverted }: SyncIndicatorProps) {
  const status = useSyncStatus()
  const { icon: Icon, label, className } = config[status]
  const tone = inverted ? 'text-icm-red-200' : className

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] ${tone}`}
      title={label}
      aria-label={label}
    >
      <Icon size={12} className={status === 'loading' ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}
