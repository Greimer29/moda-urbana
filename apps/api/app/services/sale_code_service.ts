import CounterOrderExcedidoException from '#exceptions/contador_pedido_excedido_exception'
import Counter from '#models/counter'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const MAX_VENTAS_MES = 9999

export default class SaleCodigoService {
  async generar(soldAt: DateTime, trx: TransactionClientContract): Promise<string> {
    const yyyymm = soldAt.toFormat('yyyyMM')
    const scope = `sale_${yyyymm}`
    const now = DateTime.now().toSQL({ includeOffset: false })

    await trx.rawQuery(
      `INSERT INTO counters (scope, value, updated_at) VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE value = value + 1, updated_at = VALUES(updated_at)`,
      [scope, now]
    )

    const counter = await Counter.query({ client: trx }).where('scope', scope).firstOrFail()
    const value = Number(counter.value)

    if (value > MAX_VENTAS_MES) {
      throw new CounterOrderExcedidoException()
    }

    return `VTA-${yyyymm}-${String(value).padStart(4, '0')}`
  }
}
