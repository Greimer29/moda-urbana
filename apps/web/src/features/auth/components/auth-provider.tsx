import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import { AuthContext } from '@/features/auth/auth-context'
import * as authService from '@/features/auth/services/auth-service'
import { canAccess, type PermissionKey } from '@/features/permissions/catalog'
import { refreshCsrfToken } from '@/lib/api'
import type { User } from '@/types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const permissions = user?.permissions ?? []

  const can = useCallback(
    (permission: PermissionKey) => canAccess(user?.role, permissions, permission),
    [permissions, user?.role]
  )

  const canAny = useCallback(
    (...keys: PermissionKey[]) => keys.some((permission) => can(permission)),
    [can]
  )

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      const isUnauthorized =
        axios.isAxiosError(error) && error.response?.status === 401
      const isApiUnreachable =
        axios.isAxiosError(error) &&
        (error.code === 'ERR_NETWORK' ||
          error.message === 'Network Error' ||
          error.response?.status === 500 ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504)

      if (!isUnauthorized && !isApiUnreachable && import.meta.env.DEV) {
        console.error('No se pudo cargar la sesión', error)
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  const login = useCallback(async (email: string, password: string) => {
    const authenticatedUser = await authService.login({ email, password })
    await refreshCsrfToken()
    setUser(authenticatedUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      permissions,
      isLoading,
      isAuthenticated: user !== null,
      can,
      canAny,
      login,
      logout,
    }),
    [user, permissions, isLoading, can, canAny, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
