import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Technician, Order, ServiceArea } from '../types'

export function useTechnicians() {
  return useLiveQuery(() => db.technicians.orderBy('name').toArray(), [])
}

export function useOrders() {
  return useLiveQuery(
    () => db.orders.orderBy('createdAt').reverse().toArray(),
    []
  )
}

export function useOrderStats() {
  const orders = useOrders()
  const technicians = useTechnicians()

  if (!orders || !technicians) return null

  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'pendente').length,
    activeOrders: orders.filter(
      (o) => o.status === 'confirmado' || o.status === 'em_andamento'
    ).length,
    completedOrders: orders.filter((o) => o.status === 'concluido').length,
    totalTechnicians: technicians.length,
  }
}

export async function addTechnician(data: {
  name: string
  phone: string
  email?: string
  areas: Omit<ServiceArea, 'id'>[]
}) {
  const technician: Technician = {
    id: crypto.randomUUID(),
    name: data.name,
    phone: data.phone,
    email: data.email,
    areas: data.areas.map((a) => ({ ...a, id: crypto.randomUUID() })),
    createdAt: new Date().toISOString(),
  }
  await db.technicians.add(technician)
  return technician
}

export async function updateTechnician(id: string, data: Partial<Technician>) {
  await db.technicians.update(id, data)
}

export async function deleteTechnician(id: string) {
  await db.technicians.delete(id)
}

export async function addOrder(data: Omit<Order, 'id' | 'createdAt'>) {
  const order: Order = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await db.orders.add(order)
  return order
}

export async function updateOrder(id: string, data: Partial<Order>) {
  await db.orders.update(id, data)
}

export async function deleteOrder(id: string) {
  await db.orders.delete(id)
}
