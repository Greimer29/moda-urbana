import type {
  AppUser,
  UserInput,
  UserListParams,
  UserListResponse,
  UserResponse,
} from '@/features/users/types'
import { api } from '@/lib/api'

export async function listUsers(params: UserListParams = {}) {
  const { data } = await api.get<UserListResponse>('/users', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      active: params.active,
    },
  })

  return data.data
}

export async function getUser(id: number) {
  const { data } = await api.get<UserResponse>(`/users/${id}`)
  return data.data.user
}

export async function createUser(payload: UserInput) {
  const { data } = await api.post<UserResponse>('/users', payload)
  return data.data.user as AppUser
}

export async function updateUser(id: number, payload: Partial<UserInput>) {
  const { data } = await api.put<UserResponse>(`/users/${id}`, payload)
  return data.data.user as AppUser
}

export async function setUserActive(id: number, active: boolean) {
  const { data } = await api.patch<UserResponse>(`/users/${id}/active`, { active })
  return data.data.user as AppUser
}
