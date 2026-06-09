import Dexie, { type Table } from 'dexie'
import type { Technician, Order } from '../types'

export class ICMDatabase extends Dexie {
  technicians!: Table<Technician>
  orders!: Table<Order>

  constructor() {
    super('ICMPedidosDB')
    this.version(1).stores({
      technicians: 'id, name, createdAt',
      orders: 'id, numeroPedido, nomeIgreja, technicianId, status, createdAt',
    })
  }
}

export const db = new ICMDatabase()
