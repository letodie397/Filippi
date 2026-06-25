import { useState, useEffect, useCallback } from 'react'
import { getServiceData, patchServiceField } from '../firebase/repository'
import type { OrderServiceData, OrderChecklist, MaterialItem, RelatorioEntry } from '../types'

interface UseServiceDataResult {
  data: OrderServiceData | null
  loading: boolean
  saving: boolean
  error: string | null
  saveChecklist: (checklist: OrderChecklist) => Promise<void>
  saveMateriais: (materiais: MaterialItem[]) => Promise<void>
  saveRelatorios: (relatorios: RelatorioEntry[]) => Promise<void>
  reload: () => void
}

export function useServiceData(orderId: string | undefined): UseServiceDataResult {
  const [data, setData] = useState<OrderServiceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getServiceData(orderId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orderId, tick])

  async function patchField<K extends keyof OrderServiceData>(
    field: K,
    value: OrderServiceData[K]
  ) {
    if (!orderId) return
    setSaving(true)
    setError(null)
    try {
      await patchServiceField(orderId, field as 'checklist' | 'materiais' | 'relatorios', value)
      setData((prev) => ({ ...(prev ?? {}), [field]: value }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const saveChecklist = useCallback(
    (checklist: OrderChecklist) => patchField('checklist', checklist),
    [orderId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const saveMateriais = useCallback(
    (materiais: MaterialItem[]) => patchField('materiais', materiais),
    [orderId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const saveRelatorios = useCallback(
    (relatorios: RelatorioEntry[]) => patchField('relatorios', relatorios),
    [orderId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, saving, error, saveChecklist, saveMateriais, saveRelatorios, reload }
}
