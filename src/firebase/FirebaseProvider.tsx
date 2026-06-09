import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ref, onValue, set, get } from 'firebase/database'
import { database } from './config'
import { paths } from './paths'
import { mapSnapshotToArray } from './sanitize'
import { migrateLocalData } from './repository'
import { db } from '../db'
import type { Technician, Order, SyncStatus } from '../types'

interface FirebaseContextValue {
  technicians: Technician[] | undefined
  orders: Order[] | undefined
  syncStatus: SyncStatus
  syncError: string | null
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null)

async function ensureSchema() {
  const metaRef = ref(database, paths.meta)
  const snap = await get(metaRef)
  if (!snap.exists()) {
    await set(metaRef, { schemaVersion: 1, createdAt: Date.now() })
  }
}

function resolveSyncStatus(
  techReady: boolean,
  ordersReady: boolean,
  online: boolean,
  hasError: boolean
): SyncStatus {
  if (hasError) return 'error'
  if (!techReady || !ordersReady) return 'loading'
  if (!online) return 'offline'
  return 'connected'
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [technicians, setTechnicians] = useState<Technician[] | undefined>(undefined)
  const [orders, setOrders] = useState<Order[] | undefined>(undefined)
  const [techReady, setTechReady] = useState(false)
  const [ordersReady, setOrdersReady] = useState(false)
  const [online, setOnline] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const syncStatus = resolveSyncStatus(techReady, ordersReady, online, hasError)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        await ensureSchema()

        const localTechs = await db.technicians.toArray()
        const localOrders = await db.orders.toArray()
        if (localTechs.length > 0 || localOrders.length > 0) {
          await migrateLocalData(localTechs, localOrders)
        }
      } catch (error) {
        console.error('[ICM] Bootstrap Firebase:', error)
        if (!cancelled) {
          setHasError(true)
          setSyncError(
            'Não foi possível conectar ao Firebase. Verifique se o Realtime Database foi criado no console.'
          )
        }
      }
    }

    bootstrap()

    const techRef = ref(database, paths.technicians)
    const ordersRef = ref(database, paths.orders)
    const connectedRef = ref(database, '.info/connected')

    const unsubTech = onValue(
      techRef,
      (snap) => {
        if (cancelled) return
        setTechnicians(
          mapSnapshotToArray<Technician>(snap.val(), (a, b) =>
            a.name.localeCompare(b.name, 'pt-BR')
          )
        )
        setTechReady(true)
        setHasError(false)
        setSyncError(null)
      },
      (error) => {
        console.error('[ICM] Erro ao ler prestadores:', error)
        if (!cancelled) {
          setHasError(true)
          setSyncError(
            'Erro ao ler prestadores. Confira se o Realtime Database está ativo e as regras permitem leitura em /icm.'
          )
        }
      }
    )

    const unsubOrders = onValue(
      ordersRef,
      (snap) => {
        if (cancelled) return
        setOrders(
          mapSnapshotToArray<Order>(snap.val(), (a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )
        )
        setOrdersReady(true)
        setHasError(false)
        setSyncError(null)
      },
      (error) => {
        console.error('[ICM] Erro ao ler pedidos:', error)
        if (!cancelled) {
          setHasError(true)
          setSyncError(
            'Erro ao ler pedidos. Confira se o Realtime Database está ativo e as regras permitem leitura em /icm.'
          )
        }
      }
    )

    const unsubConn = onValue(connectedRef, (snap) => {
      if (cancelled) return
      setOnline(snap.val() === true)
    })

    return () => {
      cancelled = true
      unsubTech()
      unsubOrders()
      unsubConn()
    }
  }, [])

  return (
    <FirebaseContext.Provider value={{ technicians, orders, syncStatus, syncError }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export function useFirebaseContext() {
  const ctx = useContext(FirebaseContext)
  if (!ctx) {
    throw new Error('useFirebaseContext deve ser usado dentro de FirebaseProvider')
  }
  return ctx
}
