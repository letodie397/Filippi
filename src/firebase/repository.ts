import { ref, set, update, remove, runTransaction, get } from 'firebase/database'
import { database } from './config'
import { paths, normalizePedidoKey } from './paths'
import { getClientId } from './client'
import { stripUndefined } from './sanitize'
import type { Technician, Order, ServiceArea } from '../types'

export class DuplicateOrderError extends Error {
  constructor(numero: string) {
    super(`Já existe um pedido com o número ${numero}`)
    this.name = 'DuplicateOrderError'
  }
}

export class WriteConflictError extends Error {
  constructor() {
    super('Conflito de edição simultânea. Os dados foram atualizados por outro dispositivo.')
    this.name = 'WriteConflictError'
  }
}

function now() {
  return Date.now()
}

function techniciansRef() {
  return ref(database, paths.technicians)
}

function technicianRef(id: string) {
  return ref(database, `${paths.technicians}/${id}`)
}

function ordersRef() {
  return ref(database, paths.orders)
}

function orderRef(id: string) {
  return ref(database, `${paths.orders}/${id}`)
}

function orderIndexRef(numero: string) {
  return ref(database, paths.orderIndex(numero))
}

async function transactionalPatch<T extends { v?: number }>(
  recordRef: ReturnType<typeof ref>,
  patch: Partial<T>,
  expectedVersion?: number
): Promise<void> {
  const result = await runTransaction(recordRef, (current) => {
    if (!current) return undefined

    const currentVersion = (current as T).v ?? 0
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      return undefined
    }

    return stripUndefined({
      ...current,
      ...patch,
      updatedAt: now(),
      v: currentVersion + 1,
      _clientId: getClientId(),
    })
  })

  if (!result.committed) {
    throw new WriteConflictError()
  }
}

export async function createTechnician(data: {
  name: string
  phone: string
  email?: string
  areas: Omit<ServiceArea, 'id'>[]
}): Promise<Technician> {
  const id = crypto.randomUUID()
  const technician: Technician = {
    id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    areas: data.areas.map((a) => ({ ...a, id: crypto.randomUUID() })),
    createdAt: new Date().toISOString(),
    updatedAt: now(),
    v: 1,
  }

  await set(technicianRef(id), stripUndefined({ ...technician, _clientId: getClientId() }))
  return technician
}

export async function upsertTechnician(technician: Technician): Promise<void> {
  await set(
    technicianRef(technician.id),
    stripUndefined({ ...technician, updatedAt: now(), v: technician.v ?? 1, _clientId: getClientId() })
  )
}

export async function patchTechnician(id: string, data: Partial<Technician>): Promise<void> {
  const snap = await get(technicianRef(id))
  if (!snap.exists()) throw new Error('Prestador não encontrado')
  const current = snap.val() as Technician
  await transactionalPatch(technicianRef(id), data, current.v)
}

export async function removeTechnician(id: string): Promise<void> {
  await remove(technicianRef(id))
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'v'>): Promise<Order> {
  const id = crypto.randomUUID()

  const indexResult = await runTransaction(orderIndexRef(data.numeroPedido), (current) => {
    if (current !== null) return undefined
    return id
  })

  if (!indexResult.committed) {
    throw new DuplicateOrderError(data.numeroPedido)
  }

  const order: Order = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: now(),
    v: 1,
  }

  try {
    await set(orderRef(id), stripUndefined({ ...order, _clientId: getClientId() }))
  } catch (error) {
    await remove(orderIndexRef(data.numeroPedido))
    throw error
  }

  return order
}

export async function upsertOrder(order: Order): Promise<void> {
  const indexRef = orderIndexRef(order.numeroPedido)
  const snap = await get(indexRef)
  if (snap.exists() && snap.val() !== order.id) {
    throw new DuplicateOrderError(order.numeroPedido)
  }
  if (!snap.exists()) {
    await set(indexRef, order.id)
  }
  await set(
    orderRef(order.id),
    stripUndefined({ ...order, updatedAt: now(), v: order.v ?? 1, _clientId: getClientId() })
  )
}

export async function patchOrder(id: string, data: Partial<Order>): Promise<void> {
  const snap = await get(orderRef(id))
  if (!snap.exists()) throw new Error('Pedido não encontrado')

  const current = snap.val() as Order

  if (data.numeroPedido && normalizePedidoKey(data.numeroPedido) !== normalizePedidoKey(current.numeroPedido)) {
    const newIndexRef = orderIndexRef(data.numeroPedido)
    const indexResult = await runTransaction(newIndexRef, (existing) => {
      if (existing !== null && existing !== id) return undefined
      return id
    })
    if (!indexResult.committed) {
      throw new DuplicateOrderError(data.numeroPedido)
    }
    await remove(orderIndexRef(current.numeroPedido))
  }

  await transactionalPatch(orderRef(id), data, current.v)
}

export async function removeOrder(id: string): Promise<void> {
  const snap = await get(orderRef(id))
  if (!snap.exists()) return
  const order = snap.val() as Order
  await remove(orderRef(id))
  await remove(orderIndexRef(order.numeroPedido))
}

export async function migrateLocalData(
  technicians: Technician[],
  orders: Order[]
): Promise<void> {
  const metaSnap = await get(ref(database, paths.meta))
  const meta = metaSnap.val() ?? {}

  if (meta.migratedFromDexie) return

  const existingTechs = await get(techniciansRef())
  const existingOrders = await get(ordersRef())

  if (existingTechs.exists() || existingOrders.exists()) {
    await update(ref(database, paths.meta), { migratedFromDexie: true, migratedAt: now() })
    return
  }

  const updates: Record<string, unknown> = {}

  for (const tech of technicians) {
    updates[`${paths.technicians}/${tech.id}`] = stripUndefined({
      ...tech,
      updatedAt: now(),
      v: 1,
      _clientId: getClientId(),
    })
  }

  for (const order of orders) {
    updates[`${paths.orders}/${order.id}`] = stripUndefined({
      ...order,
      updatedAt: now(),
      v: 1,
      _clientId: getClientId(),
    })
    updates[paths.orderIndex(order.numeroPedido)] = order.id
  }

  updates[`${paths.meta}/migratedFromDexie`] = true
  updates[`${paths.meta}/migratedAt`] = now()
  updates[`${paths.meta}/schemaVersion`] = 1

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates)
  }
}
