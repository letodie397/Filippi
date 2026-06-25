import { useState, useEffect, useCallback } from 'react'
import { getServiceData, saveServiceData } from '../firebase/repository'
import type { OrderServiceData } from '../types'

interface UseServiceDataResult {
  data: OrderServiceData | null
  loading: boolean
  saving: boolean
  error: string | null
  save: (data: OrderServiceData) => Promise<void>
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

  const save = useCallback(
    async (newData: OrderServiceData) => {
      if (!orderId) return
      setSaving(true)
      setError(null)
      try {
        await saveServiceData(orderId, newData)
        setData(newData)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [orderId]
  )

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, saving, error, save, reload }
}
