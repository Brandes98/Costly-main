import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const pedidos = await p.pedido.findMany({
    include: { hitos: true }
  })

  let creados = 0
  for (const pedido of pedidos) {
    if (pedido.hitos.length > 0) continue // ya tiene hitos

    await p.hito.createMany({
      data: [
        { pedido_id: pedido.pedido_id, tipo: 'confirmacion',    fecha_plan: pedido.fecha_pedido, estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'pago_senal',      estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'produccion',      estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'embarque',        estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'llegada_cr',      estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'retiro_aduana',   estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'entrega_bodega',  estado: 'pendiente' },
        { pedido_id: pedido.pedido_id, tipo: 'entrega_cliente', estado: 'pendiente' },
      ]
    })
    creados++
    console.log(`✅ Hitos creados para ${pedido.codigo}`)
  }

  console.log(`\n✅ Total: ${creados} pedidos actualizados`)
} catch (e) {
  console.error('❌', e.message)
} finally {
  await p.$disconnect()
}
