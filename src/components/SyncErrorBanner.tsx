import { AlertTriangle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useSyncStatus, useSyncError } from '../hooks/useData'
import { FIREBASE_RULES_SNIPPET } from '../firebase/errors'

export function SyncErrorBanner() {
  const status = useSyncStatus()
  const syncError = useSyncError()
  const [copied, setCopied] = useState(false)

  if (status !== 'error' || !syncError) return null

  const isPermission = syncError === 'PERMISSION_DENIED'

  async function copyRules() {
    await navigator.clipboard.writeText(FIREBASE_RULES_SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-4 lg:mx-8 mt-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="shrink-0 text-red-500 mt-0.5" size={18} />
        <div className="space-y-3 min-w-0">
          {isPermission ? (
            <>
              <p className="font-medium">
                Firebase bloqueou o acesso — as regras do banco precisam ser publicadas.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-red-800 text-xs sm:text-sm">
                <li>
                  Abra{' '}
                  <a
                    href="https://console.firebase.google.com/project/filippi-82725/database/filippi-82725-default-rtdb/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Firebase → Realtime Database → Regras
                  </a>
                </li>
                <li>Apague tudo e cole o JSON abaixo</li>
                <li>Clique em <strong>Publicar</strong></li>
                <li>Recarregue esta página</li>
              </ol>
              <pre className="bg-white border border-red-200 rounded-lg p-3 text-xs overflow-x-auto text-gray-800">
                {FIREBASE_RULES_SNIPPET}
              </pre>
              <button
                type="button"
                onClick={copyRules}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-medium hover:bg-red-100"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar regras'}
              </button>
            </>
          ) : (
            <p>{syncError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
