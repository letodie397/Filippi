const CLIENT_KEY = 'icm_client_id'

export function getClientId(): string {
  const storage =
    typeof localStorage !== 'undefined'
      ? localStorage
      : undefined

  if (storage) {
    let id = storage.getItem(CLIENT_KEY)
    if (!id) {
      id = crypto.randomUUID()
      storage.setItem(CLIENT_KEY, id)
    }
    return id
  }

  return 'server-test-client'
}
