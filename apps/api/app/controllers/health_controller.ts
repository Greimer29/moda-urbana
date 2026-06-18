import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class HealthControleler {
  show(_ctx: HttpContext) {
    return {
      status: 'ok',
      timestamp: DateTime.utc().toISO(),
    }
  }
}
