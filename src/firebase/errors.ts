export const FIREBASE_RULES_SNIPPET = `{
  "rules": {
    "icm": {
      ".read": true,
      ".write": true
    }
  }
}`

export function getFirebaseErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes('permission_denied') || msg.includes('Permission denied')) {
    return 'PERMISSION_DENIED'
  }

  if (msg.includes('Failed to get document') || msg.includes('network')) {
    return 'Sem conexão com o Firebase. Verifique sua internet.'
  }

  return 'Não foi possível conectar ao Firebase. Verifique se o Realtime Database foi criado no console.'
}
