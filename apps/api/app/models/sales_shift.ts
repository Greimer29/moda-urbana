import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export type SalesShiftStatus = 'OPEN' | 'CLOSED'

export default class SalesShift extends BaseModel {
  static table = 'sales_shifts'

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime()
  declare openedAt: DateTime

  @column.dateTime()
  declare closedAt: DateTime | null

  @column()
  declare openedByUserId: number

  @column()
  declare closedByUserId: number | null

  @column()
  declare status: SalesShiftStatus

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'openedByUserId' })
  declare openedByUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'closedByUserId' })
  declare closedByUser: BelongsTo<typeof User>
}
