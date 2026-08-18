import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { column } from '@adonisjs/lucid/orm'

function consumePermissions(value: unknown): string[] | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return consumePermissions(parsed)
    } catch {
      return []
    }
  }
  return []
}

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static table = 'users'

  @column({
    consume: consumePermissions,
    prepare: (value: string[] | null) => (value == null ? null : JSON.stringify(value)),
  })
  declare permissions: string[] | null
}
