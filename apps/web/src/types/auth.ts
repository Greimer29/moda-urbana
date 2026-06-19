export type User = {
  id: number
  email: string
  name: string
  role: string
  active: boolean
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export type ApiErrorBody = {
  code: string
  message: string
  details?: unknown
}

export type ApiErrorResponse = {
  error: ApiErrorBody
}

export type AuthUserResponse = {
  data: {
    user: User
  }
}

export type AuthMessageResponse = {
  data: {
    message: string
  }
}
