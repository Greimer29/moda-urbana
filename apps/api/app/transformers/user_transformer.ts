import type User from '#models/user'
import { effectivePermissions } from '#permissions/catalog'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt']),
      active: Boolean(this.resource.active),
      permissions: effectivePermissions(this.resource.role, this.resource.permissions),
    }
  }
}
