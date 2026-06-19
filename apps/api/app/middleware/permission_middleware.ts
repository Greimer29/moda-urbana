import PermisoDenegadoException from '#exceptions/permiso_denegado_exception'
import { userHasPermission } from '#permissions/catalog'
import { resolveRoutePermission } from '#permissions/route_permissions'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      await ctx.auth.authenticateUsing(['web'])
    }

    const authenticatedUser = ctx.auth.getUserOrFail()
    const permission = resolveRoutePermission(
      ctx.request.method(),
      ctx.request.url().split('?')[0] ?? ctx.request.url()
    )

    if (!permission) {
      return next()
    }

    const permissions = Array.isArray(authenticatedUser.permissions)
      ? authenticatedUser.permissions
      : null

    if (!userHasPermission(authenticatedUser.role, permissions, permission)) {
      throw new PermisoDenegadoException()
    }

    return next()
  }
}
