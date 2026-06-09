import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ref, onValue } from 'firebase/database'
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
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [technicians, setTechnicians] = useState<Technician[] | undefined>(undefined)
  const [orders, setOrders] = useState<Order[] | undefined>(undefined)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function runMigration() {
      try {
        const localTechs = await db.technicians.toArray()
        const localOrders = await db.orders.toArray()
        if (localTechs.length > 0 || localOrders.length > 0) {
          await migrateLocalData(localTechs, localOrders)
        }
      } catch (error) {
        console.warn('[ICM] Migração Dexie → Firebase:', error)
      }
    }

    runMigration()

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
      },
      () => {
        if (!cancelled) setSyncStatus('error')
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
      },
      () => {
        if (!cancelled) setSyncStatus('error')
      }
    )

    const unsubConn = onValue(connectedRef, (snap) => {
      if (cancelled) return
      setSyncStatus(snap.val() === true ? 'connected' : 'offline')
    })

    return () => {
      cancelled = true
      unsubTech()
      unsubOrders()
      unsubConn()
    }
  }, [])

  useEffect(() => {
    if (technicians !== undefined && orders !== undefined && syncStatus === 'loading') {
      setSyncStatus('connected')
    }
  }, [technicians, orders, syncStatus])

  return (
    <FirebaseContext.Provider value={{ technicians, orders, syncStatus }}>
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
