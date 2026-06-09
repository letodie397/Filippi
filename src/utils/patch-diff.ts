export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

export function buildPatch<T extends object>(
  original: T,
  next: T,
  fields: (keyof T)[]
): Partial<T> {
  const patch: Partial<T> = {}

  for (const field of fields) {
    const before = original[field]
    const after = next[field]
    if (!valuesEqual(before, after)) {
      patch[field] = after
    }
  }

  return patch
}

export function hasPatchChanges<T extends object>(patch: Partial<T>): boolean {
  return Object.keys(patch).length > 0
}
