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

export type MatchType = 'exato' | 'prefixo' | 'palavra' | 'parcial' | 'historico' | 'maranata'

export interface ChurchIdentification {
  bairro?: string
  cidade?: string
  /** Nome antigo/extinto quando a localização foi resolvida via bairro histórico */
  bairroHistorico?: string
  /** Código oficial ICM (ex.: 060473) */
  codigoMaranata?: string
  /** Nome oficial no cadastro Maranata */
  nomeOficialMaranata?: string
  /** GPS do endereço oficial ICM (quando geocodificado) */
  lat?: number
  lng?: number
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

// ── Service Data (Checklist / Material / Relatório) ──────────────────────────

export const CHECKLIST_STEPS = [
  {
    passo: 1,
    titulo: '1º passo — Vistoria',
    itens: [
      { key: 'vistoria_equipamento', label: 'EQUIPAMENTO VISTORIADO' },
      { key: 'vistoria_local', label: 'LOCAL VERIFICADO' },
      { key: 'vistoria_materiais', label: 'MATERIAIS CONFERIDOS' },
    ],
  },
  {
    passo: 2,
    titulo: '2º passo — Execução',
    itens: [
      { key: 'exec_servico', label: 'SERVIÇO EXECUTADO' },
      { key: 'exec_teste', label: 'EQUIPAMENTO TESTADO' },
      { key: 'exec_limpeza', label: 'LOCAL ENTREGUE LIMPO' },
    ],
  },
  {
    passo: 3,
    titulo: '3º passo — Finalização',
    itens: [
      { key: 'fin_cliente', label: 'CLIENTE CIENTE E SATISFEITO' },
      { key: 'fin_relatorio', label: 'RELATÓRIO PREENCHIDO' },
      { key: 'fin_fotos', label: 'FOTOS REGISTRADAS' },
      { key: 'fin_materiais', label: 'MATERIAIS DOCUMENTADOS' },
    ],
  },
] as const

export type ChecklistKey =
  | 'vistoria_equipamento'
  | 'vistoria_local'
  | 'vistoria_materiais'
  | 'exec_servico'
  | 'exec_teste'
  | 'exec_limpeza'
  | 'fin_cliente'
  | 'fin_relatorio'
  | 'fin_fotos'
  | 'fin_materiais'

export interface ChecklistResponsavel {
  nome: string
  telefone: string
  cpf: string
  assinatura: string
}

export interface ChecklistItemData {
  key: ChecklistKey
  resposta: 'sim' | 'nao' | null
}

export interface OrderChecklist {
  responsavel: ChecklistResponsavel
  itens: ChecklistItemData[]
  atualizadoEm?: string
}

export interface MaterialItem {
  id: string
  nome: string
  quantidade: number
  imagemAntigo: string | null
  imagemNovo: string | null
  justificativa: string
}

export interface RelatorioEntry {
  id: string
  texto: string
  imagens: string[]
  criadoEm: string
}

export interface OrderServiceData {
  checklist?: OrderChecklist
  materiais?: MaterialItem[]
  relatorios?: RelatorioEntry[]
  atualizadoEm?: string
}
