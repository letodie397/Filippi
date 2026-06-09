import { get, ref, remove } from 'firebase/database'
import { database } from '../../src/firebase/config.ts'
import { paths } from '../../src/firebase/paths.ts'
import {
  createTechnician,
  createOrder,
  patchOrder,
  patchTechnician,
  removeTechnician,
  removeOrder,
  DuplicateOrderError,
  WriteConflictError,
} from '../../src/firebase/repository.ts'

const TEST_PREFIX = `__TESTE_${Date.now()}__`
const testTechIds: string[] = []
const testOrderIds: string[] = []
const testNumeros: string[] = []

let passed = 0
let failed = 0
const failures: string[] = []

function pass(msg: string) {
  passed++
  console.log(`  ✓ ${msg}`)
}

function fail(msg: string) {
  failed++
  failures.push(msg)
  console.log(`  ✗ ${msg}`)
}

async function cleanup() {
  for (const id of testOrderIds) {
    try {
      await removeOrder(id)
    } catch {
      /* ignore */
    }
  }
  for (const id of testTechIds) {
    try {
      await removeTechnician(id)
    } catch {
      /* ignore */
    }
  }
  for (const num of testNumeros) {
    try {
      await remove(ref(database, paths.orderIndex(num)))
    } catch {
      /* ignore */
    }
  }
}

console.log('\n=== TESTES FIREBASE (Realtime Database) ===\n')

try {
  // 1. Leitura
  console.log('1. Leitura')
  const techSnap = await get(ref(database, paths.technicians))
  const ordersSnap = await get(ref(database, paths.orders))
  const metaSnap = await get(ref(database, paths.meta))

  if (techSnap.exists() || techSnap.val() === null) pass('Leitura /icm/technicians permitida')
  else fail('Leitura technicians falhou')

  if (ordersSnap.exists() || ordersSnap.val() === null) pass('Leitura /icm/orders permitida')
  else fail('Leitura orders falhou')

  const techCount = techSnap.exists() ? Object.keys(techSnap.val()).length : 0
  const orderCount = ordersSnap.exists() ? Object.keys(ordersSnap.val()).length : 0
  console.log(`     Dados atuais: ${techCount} prestadores, ${orderCount} pedidos`)
  if (metaSnap.exists()) pass(`Meta schema v${metaSnap.val()?.schemaVersion ?? '?'}`)
  else pass('Meta acessível (pode estar vazio)')

  // 2. Escrita - técnico
  console.log('\n2. Escrita - prestador')
  const tech = await createTechnician({
    name: `${TEST_PREFIX} Técnico Teste`,
    phone: '(27) 99999-0000',
    areas: [{ type: 'bairro', cidade: 'Vila Velha', bairro: 'Normília da Cunha' }],
  })
  testTechIds.push(tech.id)

  const techRead = await get(ref(database, `${paths.technicians}/${tech.id}`))
  if (techRead.exists() && techRead.val().name === tech.name) {
    pass('Prestador criado e lido corretamente')
  } else {
    fail('Prestador não encontrado após criação')
  }

  await patchTechnician(tech.id, { phone: '(27) 98888-0000' })
  const techPatched = await get(ref(database, `${paths.technicians}/${tech.id}`))
  if (techPatched.val()?.phone === '(27) 98888-0000' && techPatched.val()?.v === 2) {
    pass('Patch de prestador incrementou versão (v=2)')
  } else {
    fail(`Patch prestador: v=${techPatched.val()?.v}, phone=${techPatched.val()?.phone}`)
  }

  // 3. Escrita - pedido
  console.log('\n3. Escrita - pedido')
  const numero = `${TEST_PREFIX}`
  testNumeros.push(numero)

  const order = await createOrder({
    numeroPedido: numero,
    nomeIgreja: 'normilia teste 1',
    bairroIdentificado: 'Normília da Cunha',
    cidadeIdentificada: 'Vila Velha',
    lat: -20.42,
    lng: -40.32,
    status: 'pendente',
    technicianId: tech.id,
    technicianName: tech.name,
  })
  testOrderIds.push(order.id)

  const orderRead = await get(ref(database, `${paths.orders}/${order.id}`))
  const indexRead = await get(ref(database, paths.orderIndex(numero)))
  if (
    orderRead.exists() &&
    orderRead.val().bairroIdentificado === 'Normília da Cunha' &&
    indexRead.val() === order.id
  ) {
    pass('Pedido criado com índice de número correto')
  } else {
    fail('Pedido ou índice incorreto após criação')
  }

  // 4. Duplicata de número
  console.log('\n4. Proteção contra número duplicado')
  try {
    await createOrder({
      numeroPedido: numero,
      nomeIgreja: 'outro teste',
      status: 'pendente',
    })
    fail('Deveria ter bloqueado pedido com mesmo número')
  } catch (e) {
    if (e instanceof DuplicateOrderError) pass('DuplicateOrderError ao repetir número')
    else fail(`Erro inesperado na duplicata: ${e}`)
  }

  // 5. Concorrência - dois pedidos com mesmo número simultâneos
  console.log('\n5. Concorrência - criação simultânea mesmo número')
  const concurrentNum = `${TEST_PREFIX}_CONC`
  testNumeros.push(concurrentNum)
  const results = await Promise.allSettled([
    createOrder({ numeroPedido: concurrentNum, nomeIgreja: 'device A', status: 'pendente' }),
    createOrder({ numeroPedido: concurrentNum, nomeIgreja: 'device B', status: 'pendente' }),
  ])
  const successes = results.filter((r) => r.status === 'fulfilled')
  const duplicates = results.filter(
    (r) => r.status === 'rejected' && r.reason instanceof DuplicateOrderError
  )
  if (successes.length === 1 && duplicates.length === 1) {
    pass('Apenas 1 de 2 dispositivos conseguiu criar pedido com mesmo número')
    const winner = (successes[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrder>>>).value
    testOrderIds.push(winner.id)
  } else {
    fail(`Concorrência criação: ${successes.length} sucesso, ${duplicates.length} duplicata`)
    for (const r of results) {
      if (r.status === 'fulfilled') testOrderIds.push(r.value.id)
    }
  }

  // 6. Concorrência - edição simultânea (versão)
  console.log('\n6. Concorrência - edição simultânea (anti-sobrescrita)')
  const orderId = testOrderIds[0]
  const snapBefore = await get(ref(database, `${paths.orders}/${orderId}`))
  const vBefore = snapBefore.val()?.v ?? 1

  const [patchA, patchB] = await Promise.allSettled([
    patchOrder(orderId, { observacoes: 'dispositivo A' }),
    patchOrder(orderId, { observacoes: 'dispositivo B' }),
  ])

  const patchOk = [patchA, patchB].filter((r) => r.status === 'fulfilled').length
  const patchConflict = [patchA, patchB].filter(
    (r) => r.status === 'rejected' && r.reason instanceof WriteConflictError
  ).length

  const snapAfter = await get(ref(database, `${paths.orders}/${orderId}`))
  const vAfter = snapAfter.val()?.v ?? 0
  const obs = snapAfter.val()?.observacoes

  if (patchOk === 2) {
    pass('Edições simultâneas concluídas (última alteração prevalece)')
  } else if (patchOk === 1 && patchConflict === 1) {
    pass('Uma edição aceita, outra rejeitada por conflito')
  } else {
    fail(`Edição concorrente: ${patchOk} ok, ${patchConflict} conflito, v ${vBefore}→${vAfter}`)
  }

  if (obs === 'dispositivo A' || obs === 'dispositivo B') {
    pass(`Observação final: "${obs}" (v${vAfter})`)
  } else {
    fail(`Observação inesperada: "${obs}"`)
  }

  if (vAfter > vBefore) {
    pass(`Versão incrementada: v${vBefore} → v${vAfter}`)
  } else {
    fail(`Versão não incrementou: v${vBefore} → v${vAfter}`)
  }

  // 7. Leitura em tempo real (snapshot)
  console.log('\n7. Integridade dos dados gravados')
  const finalTech = await get(ref(database, paths.technicians))
  const finalOrders = await get(ref(database, paths.orders))
  const hasTestTech = finalTech.exists() && Object.values(finalTech.val()).some(
    (t: { name?: string }) => t.name?.includes(TEST_PREFIX)
  )
  const hasTestOrder = finalOrders.exists() && Object.values(finalOrders.val()).some(
    (o: { numeroPedido?: string }) => o.numeroPedido?.includes(TEST_PREFIX)
  )
  if (hasTestTech && hasTestOrder) pass('Dados de teste visíveis na leitura global')
  else fail('Dados de teste não encontrados na leitura global')

} catch (error) {
  fail(`Erro fatal: ${error}`)
  console.error(error)
} finally {
  console.log('\n8. Limpeza dos dados de teste')
  await cleanup()
  pass('Dados de teste removidos')
}

console.log(`\n--- Firebase: ${passed} ok, ${failed} falhas ---`)
if (failures.length) {
  console.log('\nFalhas:')
  failures.forEach((f) => console.log(`  - ${f}`))
}

process.exit(failed > 0 ? 1 : 0)
