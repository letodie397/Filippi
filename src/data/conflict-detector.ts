import type { ConflictAlert, Technician, Order, ChurchIdentification, OrderStatus } from '../types'
import { ESTADO_ES, getBairroCoordinates } from './es-locations'
import type { Coordinates } from './geo-utils'
import {
  PROXIMITY_RADIUS_KM,
  haversineDistanceKm,
  formatDistance,
} from './geo-utils'

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pendente', 'confirmado', 'em_andamento']

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function resolveCoordinates(
  cidade?: string,
  bairro?: string,
  stored?: { lat?: number; lng?: number }
): Coordinates | undefined {
  if (stored?.lat != null && stored?.lng != null) {
    return { lat: stored.lat, lng: stored.lng }
  }
  if (cidade && bairro) {
    return getBairroCoordinates(cidade, bairro)
  }
  return undefined
}

function technicianCoversArea(
  tech: Technician,
  cidade?: string,
  bairro?: string
): boolean {
  return tech.areas.some((area) => {
    if (area.type === 'estado') return true

    if (cidade && normalize(area.cidade) === normalize(cidade)) {
      if (area.type === 'cidade') return true
      if (area.type === 'bairro' && bairro && area.bairro) {
        return normalize(area.bairro) === normalize(bairro)
      }
    }

    if (area.type === 'bairro' && bairro && area.bairro) {
      return normalize(area.bairro) === normalize(bairro)
    }

    return false
  })
}

function technicianCoversCity(tech: Technician, cidade: string): boolean {
  return tech.areas.some((area) => {
    if (area.type === 'estado') return true
    return normalize(area.cidade) === normalize(cidade)
  })
}

function technicianCoversBairro(tech: Technician, bairro: string, cidade?: string): boolean {
  return tech.areas.some((area) => {
    if (area.type === 'estado') return false
    if (area.type === 'bairro' && area.bairro) {
      const bairroMatch = normalize(area.bairro) === normalize(bairro)
      if (!bairroMatch) return false
      if (cidade) return normalize(area.cidade) === normalize(cidade)
      return true
    }
    return false
  })
}

function isSameLocation(
  bairro?: string,
  cidade?: string,
  orderBairro?: string,
  orderCidade?: string
): boolean {
  if (!bairro || !cidade || !orderBairro || !orderCidade) return false
  return normalize(bairro) === normalize(orderBairro) && normalize(cidade) === normalize(orderCidade)
}

function isNearbyBairro(bairro?: string, orderBairro?: string): boolean {
  if (!bairro || !orderBairro) return false
  const b1 = normalize(bairro)
  const b2 = normalize(orderBairro)
  if (b1 === b2) return false

  if (b1.startsWith(b2) || b2.startsWith(b1)) return true

  const w1 = b1.split(/\s+/)[0]
  const w2 = b2.split(/\s+/)[0]
  if (w1.length >= 4 && w1 === w2) return true

  if (b1.includes('ponta') && b2.includes('ponta')) return true
  if (b1.includes('jucu') && b2.includes('jucu')) return true
  if (b1.includes('normil') && b2.includes('jucu')) return true
  if (b1.includes('jucu') && b2.includes('normil')) return true

  return false
}

function isNearbyLocation(
  bairro?: string,
  cidade?: string,
  orderBairro?: string,
  orderCidade?: string
): boolean {
  if (!cidade || !orderCidade) return false
  if (normalize(cidade) !== normalize(orderCidade)) return false
  if (isSameLocation(bairro, cidade, orderBairro, orderCidade)) return false

  if (bairro && orderBairro) {
    return isNearbyBairro(bairro, orderBairro)
  }

  return false
}

function isSameAssignedTechnician(
  assignedTechnicianId?: string,
  orderTechnicianId?: string
): boolean {
  return !!(
    assignedTechnicianId &&
    orderTechnicianId &&
    assignedTechnicianId === orderTechnicianId
  )
}

function getActiveOrders(orders: Order[], excludeOrderId?: string): Order[] {
  return orders.filter(
    (o) =>
      ACTIVE_ORDER_STATUSES.includes(o.status) &&
      o.bairroIdentificado &&
      o.cidadeIdentificada &&
      o.id !== excludeOrderId
  )
}

function detectOrderConflicts(
  existingOrders: Order[],
  bairro?: string,
  cidade?: string,
  assignedTechnicianId?: string,
  excludeOrderId?: string,
  newStoredCoords?: { lat?: number; lng?: number }
): ConflictAlert[] {
  const alerts: ConflictAlert[] = []
  const activeOrders = getActiveOrders(existingOrders, excludeOrderId)
  const newCoords = resolveCoordinates(cidade, bairro, newStoredCoords)
  const newLocation = bairro && cidade ? `${bairro}, ${cidade}` : cidade ?? bairro

  for (const order of activeOrders) {
    if (isSameAssignedTechnician(assignedTechnicianId, order.technicianId)) {
      continue
    }

    const orderBairro = order.bairroIdentificado!
    const orderCidade = order.cidadeIdentificada!
    const locationLabel = `${orderBairro}, ${orderCidade}`
    const techInfo = order.technicianName
      ? ` O técnico ${order.technicianName} já está atribuído a esse pedido.`
      : ' Este pedido ainda não tem técnico atribuído.'

    const baseAlert = {
      technicianId: order.technicianId,
      technicianName: order.technicianName,
      orderId: order.id,
      orderNumero: order.numeroPedido,
      orderIgreja: order.nomeIgreja,
    }

    if (isSameLocation(bairro, cidade, orderBairro, orderCidade)) {
      alerts.push({
        ...baseAlert,
        type: 'pedido_mesmo_bairro',
        message: `Já existe o pedido #${order.numeroPedido} (${order.nomeIgreja}) no mesmo bairro — ${locationLabel}.${techInfo}`,
        severity:
          order.technicianId && order.technicianId !== assignedTechnicianId ? 'error' : 'warning',
      })
      continue
    }

    const orderCoords = resolveCoordinates(orderCidade, orderBairro, order)

    if (newCoords && orderCoords) {
      const distanceKm = haversineDistanceKm(newCoords, orderCoords)
      if (distanceKm <= PROXIMITY_RADIUS_KM) {
        alerts.push({
          ...baseAlert,
          type: 'pedido_raio',
          distanceKm,
          message: `Pedido a ${formatDistance(distanceKm)} de distância (raio de ${PROXIMITY_RADIUS_KM} km): #${order.numeroPedido} (${order.nomeIgreja}) em ${locationLabel}. Novo pedido em ${newLocation}.${techInfo}`,
          severity: order.technicianId ? 'warning' : 'info',
        })
      }
      continue
    }

    if (
      normalize(orderCidade) === normalize(cidade ?? '') &&
      order.technicianId &&
      (!newCoords || !orderCoords)
    ) {
      alerts.push({
        ...baseAlert,
        type: 'pedido_proximo',
        message: `Há um pedido ativo na mesma cidade: #${order.numeroPedido} (${order.nomeIgreja}) em ${locationLabel}. Novo pedido em ${newLocation}.${techInfo}`,
        severity: 'warning',
      })
      continue
    }

    if (isNearbyLocation(bairro, cidade, orderBairro, orderCidade)) {
      alerts.push({
        ...baseAlert,
        type: 'pedido_proximo',
        message: `Pedido próximo detectado: #${order.numeroPedido} (${order.nomeIgreja}) em ${locationLabel}. Novo pedido em ${newLocation}.${techInfo}`,
        severity: order.technicianId ? 'warning' : 'info',
      })
    }
  }

  return alerts.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
}

export function detectConflicts(
  technicians: Technician[],
  identification: ChurchIdentification,
  existingOrders: Order[] = [],
  assignedTechnicianId?: string,
  excludeOrderId?: string,
  newStoredCoords?: { lat?: number; lng?: number }
): ConflictAlert[] {
  const alerts: ConflictAlert[] = []
  const { bairro, cidade } = identification

  if (!cidade && !bairro) {
    alerts.push({
      type: 'sem_tecnico',
      message: 'Não foi possível identificar a localização da igreja. Verifique o nome informado.',
      severity: 'info',
    })
    return alerts
  }

  const orderAlerts = detectOrderConflicts(
    existingOrders,
    bairro,
    cidade,
    assignedTechnicianId,
    excludeOrderId,
    newStoredCoords
  )
  alerts.push(...orderAlerts)

  const coveringTechs = technicians.filter((tech) =>
    technicianCoversArea(tech, cidade, bairro)
  )

  const otherCoveringTechs = coveringTechs.filter(
    (tech) => tech.id !== assignedTechnicianId
  )

  if (otherCoveringTechs.length > 0) {
    const names = otherCoveringTechs.map((t) => t.name).join(', ')
    const location = bairro && cidade ? `${bairro}, ${cidade}` : cidade ?? bairro

    alerts.push({
      type: 'area_outro_tecnico',
      message: `A igreja em ${location} está na área de atendimento de: ${names}. Deseja continuar mesmo assim?`,
      technicianId: otherCoveringTechs[0].id,
      technicianName: otherCoveringTechs[0].name,
      severity: 'warning',
    })
  }

  if (cidade) {
    const proximityTechs = technicians.filter((tech) => {
      if (tech.id === assignedTechnicianId) return false
      if (otherCoveringTechs.some((t) => t.id === tech.id)) return false
      return technicianCoversCity(tech, cidade)
    })

    if (proximityTechs.length > 0 && bairro) {
      const nearbyWithBairro = proximityTechs.filter((tech) =>
        tech.areas.some(
          (a) =>
            a.type === 'bairro' &&
            normalize(a.cidade) === normalize(cidade) &&
            a.bairro &&
            normalize(a.bairro) !== normalize(bairro)
        )
      )

      if (nearbyWithBairro.length > 0) {
        const names = nearbyWithBairro.map((t) => t.name).join(', ')
        alerts.push({
          type: 'proximidade_outro_tecnico',
          message: `Existem técnicos cadastrados para bairros próximos em ${cidade}: ${names}. Confirme se este pedido pertence à área correta.`,
          technicianId: nearbyWithBairro[0].id,
          technicianName: nearbyWithBairro[0].name,
          severity: 'warning',
        })
      } else if (proximityTechs.length > 0 && otherCoveringTechs.length === 0 && orderAlerts.length === 0) {
        const names = proximityTechs.map((t) => t.name).join(', ')
        alerts.push({
          type: 'proximidade_outro_tecnico',
          message: `Há técnicos cadastrados para a cidade de ${cidade}: ${names}. Verifique se o bairro "${bairro ?? 'não identificado'}" está correto.`,
          technicianId: proximityTechs[0].id,
          technicianName: proximityTechs[0].name,
          severity: 'info',
        })
      }
    }
  }

  if (bairro && cidade) {
    const exactBairroTechs = technicians.filter(
      (tech) =>
        tech.id !== assignedTechnicianId &&
        technicianCoversBairro(tech, bairro, cidade)
    )

    for (const tech of exactBairroTechs) {
      if (!alerts.some((a) => a.technicianId === tech.id && a.type === 'area_outro_tecnico')) {
        alerts.push({
          type: 'area_outro_tecnico',
          message: `O técnico ${tech.name} já atende o bairro ${bairro} em ${cidade}.`,
          technicianId: tech.id,
          technicianName: tech.name,
          severity: 'error',
        })
      }
    }
  }

  const hasOrderAlerts = alerts.some(
    (a) =>
      a.type === 'pedido_raio' ||
      a.type === 'pedido_proximo' ||
      a.type === 'pedido_mesmo_bairro'
  )

  if (!hasOrderAlerts && alerts.length === 0 && coveringTechs.length === 0 && cidade) {
    alerts.push({
      type: 'sem_tecnico',
      message: `Nenhum técnico cadastrado para ${bairro ? `${bairro}, ` : ''}${cidade} - ${ESTADO_ES}. Considere cadastrar um prestador para esta região.`,
      severity: 'info',
    })
  }

  return alerts
}

export function suggestTechnician(
  technicians: Technician[],
  identification: ChurchIdentification,
  existingOrders: Order[] = [],
  newStoredCoords?: { lat?: number; lng?: number }
): Technician | undefined {
  const { bairro, cidade } = identification

  const activeOrders = getActiveOrders(existingOrders)
  const newCoords = resolveCoordinates(cidade, bairro, newStoredCoords)

  const sameBairroOrder = activeOrders.find((o) =>
    isSameLocation(bairro, cidade, o.bairroIdentificado, o.cidadeIdentificada)
  )
  if (sameBairroOrder?.technicianId) {
    const tech = technicians.find((t) => t.id === sameBairroOrder.technicianId)
    if (tech) return tech
  }

  if (newCoords) {
    let closestOrder: Order | undefined
    let closestDistance = Infinity

    for (const o of activeOrders) {
      if (!o.technicianId || !o.bairroIdentificado || !o.cidadeIdentificada) continue
      const coords = resolveCoordinates(o.cidadeIdentificada, o.bairroIdentificado, o)
      if (!coords) continue
      const dist = haversineDistanceKm(newCoords, coords)
      if (dist <= PROXIMITY_RADIUS_KM && dist < closestDistance) {
        closestDistance = dist
        closestOrder = o
      }
    }

    if (closestOrder?.technicianId) {
      const tech = technicians.find((t) => t.id === closestOrder!.technicianId)
      if (tech) return tech
    }
  }

  const nearbyOrder = activeOrders.find(
    (o) =>
      o.technicianId &&
      isNearbyLocation(bairro, cidade, o.bairroIdentificado, o.cidadeIdentificada)
  )
  if (nearbyOrder?.technicianId) {
    const tech = technicians.find((t) => t.id === nearbyOrder.technicianId)
    if (tech) return tech
  }

  const exact = technicians.find((tech) =>
    technicianCoversArea(tech, cidade, bairro)
  )
  if (exact) return exact

  if (cidade) {
    return technicians.find((tech) => technicianCoversCity(tech, cidade))
  }

  return undefined
}
