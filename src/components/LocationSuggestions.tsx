import { MapPin, Check } from 'lucide-react'
import type { ChurchIdentification, ChurchIdentificationCandidate } from '../types'
import { ConfidenceBadge } from './ui/Badge'

const matchTypeLabel = {
  exato: 'Nome exato',
  prefixo: 'Início do nome',
  palavra: 'Primeira palavra',
  parcial: 'Correspondência parcial',
  historico: 'Bairro histórico',
  maranata: 'Cadastro oficial ICM',
}

interface LocationSuggestionsProps {
  suggestions: ChurchIdentificationCandidate[]
  selected?: ChurchIdentification | null
  needsSelection: boolean
  onSelect: (candidate: ChurchIdentificationCandidate) => void
}

export function LocationSuggestions({
  suggestions,
  selected,
  needsSelection,
  onSelect,
}: LocationSuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {needsSelection
            ? 'Múltiplas opções encontradas — selecione a correta:'
            : suggestions.length > 1
              ? 'Outras opções encontradas:'
              : 'Opção encontrada:'}
        </p>
        {needsSelection && (
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
            Seleção necessária
          </span>
        )}
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => {
          const isSelected =
            selected?.bairro === suggestion.bairro &&
            selected?.cidade === suggestion.cidade

          return (
            <button
              key={`${suggestion.bairro}-${suggestion.cidade}-${index}`}
              type="button"
              onClick={() => onSelect(suggestion)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-icm-red-500 bg-icm-red-50 ring-2 ring-icm-red-200'
                  : 'border-gray-200 bg-white hover:border-icm-red-300 hover:bg-icm-red-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-icm-red-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isSelected ? <Check size={16} /> : <MapPin size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{suggestion.bairro}</span>
                    <ConfidenceBadge confidence={suggestion.confidence} />
                    {suggestion.matchType && (
                      <span className="text-xs text-gray-400">
                        {matchTypeLabel[suggestion.matchType]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{suggestion.cidade} — ES</p>
                  {suggestion.matchType === 'maranata' && suggestion.nomeOficialMaranata && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-1.5">
                      ICM oficial: <strong>{suggestion.nomeOficialMaranata}</strong>
                      {suggestion.codigoMaranata && (
                        <span className="text-emerald-600"> ({suggestion.codigoMaranata})</span>
                      )}
                    </p>
                  )}
                  {suggestion.bairroHistorico && suggestion.bairroHistorico !== suggestion.bairro && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1.5">
                      Nome antigo da igreja: <strong>{suggestion.bairroHistorico}</strong> → hoje{' '}
                      {suggestion.bairro}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Correspondência: "{suggestion.matchedFrom}"
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
