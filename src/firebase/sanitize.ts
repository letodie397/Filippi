export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? stripUndefined(item as Record<string, unknown>)
          : item
      )
    } else if (value && typeof value === 'object') {
      out[key] = stripUndefined(value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out as Partial<T>
}

export function mapSnapshotToArray<T extends { id?: string; createdAt?: string }>(
  data: Record<string, T> | null | undefined,
  sort: (a: T & { id: string }, b: T & { id: string }) => number
): (T & { id: string })[] {
  if (!data) return []
  return Object.entries(data)
    .map(([id, item]) => ({ ...item, id: item.id ?? id }))
    .sort(sort)
}
