export type AreaType = 'estado' | 'cidade' | 'bairro'

export interface ServiceArea {
  id: string
  type: AreaType
  cidade: string
  bairro?: string
}

export interface Technician {
  id: string
  name: string
  phone: string
  email?: string
  areas: ServiceArea[]
  createdAt: string
  updatedAt?: number
  v?: number
}

export type OrderStatus = 'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'

export interface Order {
  id: string
  numeroPedido: string
  nomeIgreja: string
  bairroIdentificado?: string
  cidadeIdentificada?: string
  lat?: number
  lng?: number
  technicianId?: string
  technicianName?: string
  status: OrderStatus
  observacoes?: string
  createdAt: string
  updatedAt?: number
  v?: number
}

export type SyncStatus = 'loading' | 'connected' | 'offline' | 'error'

export type AlertType =
  | 'area_outro_tecnico'
  | 'proximidade_outro_tecnico'
  | 'pedido_mesmo_bairro'
  | 'pedido_proximo'
  | 'pedido_raio'
  | 'sem_tecnico'

export interface ConflictAlert {
  type: AlertType
  message: string
  technicianId?: string
  technicianName?: string
  orderId?: string
  orderNumero?: string
  orderIgreja?: string
  distanceKm?: number
  severity: 'warning' | 'info' | 'error'
}

export type MatchType = 'exato' | 'prefixo' | 'palavra' | 'parcial' | 'historico'

export interface ChurchIdentification {
  bairro?: string
  cidade?: string
  /** Nome antigo/extinto quando a localização foi resolvida via bairro histórico */
  bairroHistorico?: string
  confidence: 'alta' | 'media' | 'baixa'
  matchedFrom: string
  matchType?: MatchType
}

export interface ChurchIdentificationCandidate extends ChurchIdentification {
  bairro: string
  cidade: string
  score: number
  matchType: MatchType
}

export interface ChurchSearchResult {
  query: string
  best?: ChurchIdentification
  suggestions: ChurchIdentificationCandidate[]
  needsSelection: boolean
}
