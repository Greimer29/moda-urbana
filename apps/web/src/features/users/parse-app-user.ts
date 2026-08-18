import { isValidPermission, type PermissionKey } from '@/features/permissions/catalog'
import type { AppUser, AppUserRole } from '@/features/users/types'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function permissionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return permissionList(parsed)
    } catch {
      return []
    }
  }

  return []
}

function parsePermissions(role: AppUserRole, value: unknown): AppUser['permissions'] {
  if (role === 'ADMIN') {
    return ['*']
  }

  const permissions: PermissionKey[] = permissionList(value).filter(isValidPermission)
  return permissions
}

export function parseAppUser(raw: unknown): AppUser {
  const record = asRecord(raw)
  if (!record) {
    throw new Error('Respuesta de usuario inválida')
  }

  const attrs = asRecord(record.$attributes) ?? asRecord(record.attributes) ?? record
  const role = String(attrs.role ?? record.role ?? 'OPERATOR') as AppUserRole
  const rawId = attrs.id ?? record.id
  const parsedId = rawId === undefined || rawId === null ? 0 : Number(rawId)

  return {
    id: Number.isFinite(parsedId) ? parsedId : 0,
    name: String(attrs.name ?? record.name ?? ''),
    email: String(attrs.email ?? record.email ?? ''),
    role,
    active: Boolean(attrs.active ?? record.active ?? true),
    permissions: parsePermissions(role, attrs.permissions ?? record.permissions),
    createdAt: String(attrs.createdAt ?? attrs.created_at ?? record.createdAt ?? ''),
    updatedAt: String(attrs.updatedAt ?? attrs.updated_at ?? record.updatedAt ?? ''),
  }
}

export function isAppUserActionable(user: AppUser): boolean {
  return user.id > 0
}

export function isAppUserListIncomplete(users: AppUser[]): boolean {
  return users.some((user) => !isAppUserActionable(user) || !user.name.trim() || !user.email.trim())
}
