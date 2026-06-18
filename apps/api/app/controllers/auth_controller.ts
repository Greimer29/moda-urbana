import User from '#models/user'
import UserInactiveException from '#exceptions/user_inactive_exception'
import { loginValidator } from '#validators/user'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class AuthControleler {
  /**
   * POST /api/v1/auth/login
   */
  async login({ request, auth, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    if (!user.active) {
      throw new UserInactiveException()
    }

    await auth.use('web').login(user)

    return serialize({
      user: UserTransformer.transform(user),
    })
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout({ auth, serialize }: HttpContext) {
    await auth.use('web').logout()

    return serialize({
      message: 'Sesión cerrada correctamente',
    })
  }

  /**
   * GET /api/v1/auth/me
   */
  async me({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    return serialize({
      user: UserTransformer.transform(user),
    })
  }
}
