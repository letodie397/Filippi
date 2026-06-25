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

export const CHECKLIST_ITENS = [
  { key: 'item_0',  label: 'TODAS AS CAIXAS DO TEMPLO ESTÃO FUNCIONANDO PERFEITAMENTE?' },
  { key: 'item_1',  label: 'OS DIÂMETROS DOS CABOS DE LIGAÇÃO DAS CAIXAS ESTÃO DENTRO DAS NORMAS?' },
  { key: 'item_2',  label: 'TODOS OS RETORNOS ESTÃO FUNCIONANDO PERFEITAMENTE?' },
  { key: 'item_3',  label: 'OS CABOS DO RETORNO SÃO PP?' },
  { key: 'item_4',  label: 'AS CAIXAS DO TEMPLO ESTÃO ALINHADAS?' },
  { key: 'item_5',  label: 'TODOS OS CANAIS DA MESA FORAM TESTADOS?' },
  { key: 'item_6',  label: 'TODOS AS LIGAÇÕES DOS CANAIS DOS AMPLIFICADORES ESTÃO CORRETAS?' },
  { key: 'item_7',  label: 'O MICROFONE DO PÚLPITO ESTÁ FUNCIONANDO?' },
  { key: 'item_8',  label: 'TODOS OS CABOS FORAM TESTADOS E ESTÃO APTOS A UTILIZAR?' },
  { key: 'item_9',  label: 'OS CABOS ESTÃO ORGANIZADOS?' },
  { key: 'item_10', label: 'OS EQUIPAMENTOS ESTÃO EM BOAS CONDIÇÕES OU CONSERVADO?' },
  { key: 'item_11', label: 'OS MICROFONES ESPECÍFICOS (CORDAS, METAIS, GRUPO, ETC.) ESTÃO FUNCIONANDO?' },
  { key: 'item_12', label: 'O SISTEMA DE SATÉLITE ESTÁ FUNCIONANDO CORRETAMENTE?' },
  { key: 'item_13', label: 'O PROCESSADOR ESTÁ ALINHADO COM O LOCAL?' },
  { key: 'item_14', label: 'TODAS AS VIAS DA MEDUSA ESTÃO FUNCIONANDO?' },
  { key: 'item_15', label: 'A IGREJA POSSUI SISTEMA DE ATERRAMENTO PARA O SOM?' },
  { key: 'item_16', label: 'A IGREJA POSSUI UM DISJUNTOR EXCLUSIVO PARA O SOM?' },
  { key: 'item_17', label: 'A IGREJA POSSUI EQUIPAMENTOS EXCEDENTES?' },
] as const

export type ChecklistKey =
  | 'item_0' | 'item_1' | 'item_2' | 'item_3' | 'item_4' | 'item_5'
  | 'item_6' | 'item_7' | 'item_8' | 'item_9' | 'item_10' | 'item_11'
  | 'item_12' | 'item_13' | 'item_14' | 'item_15' | 'item_16' | 'item_17'

export interface ChecklistResponsavel {
  nome: string
  telefone: string
  cpf: string
  assinatura: string
}

export interface ChecklistItemData {
  key: ChecklistKey
  resposta: 'sim' | 'nao' | 'na' | null
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
