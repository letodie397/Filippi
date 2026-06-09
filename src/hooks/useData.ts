import { useFirebaseContext } from '../firebase/FirebaseProvider'
import {
  createTechnician,
  patchTechnician,
  removeTechnician,
  createOrder,
  patchOrder,
  removeOrder,
} from '../firebase/repository'
import type { Technician, Order, ServiceArea } from '../types'

export function useTechnicians() {
  return useFirebaseContext().technicians
}

export function useOrders() {
  return useFirebaseContext().orders
}

export function useSyncStatus() {
  return useFirebaseContext().syncStatus
}

export function useSyncError() {
  return useFirebaseContext().syncError
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
  return createTechnician(data)
}

export async function updateTechnician(id: string, data: Partial<Technician>) {
  await patchTechnician(id, data)
}

export async function deleteTechnician(id: string) {
  await removeTechnician(id)
}

export async function addOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'v'>) {
  return createOrder(data)
}

export async function updateOrder(id: string, data: Partial<Order>) {
  await patchOrder(id, data)
}

export async function deleteOrder(id: string) {
  await removeOrder(id)
}
