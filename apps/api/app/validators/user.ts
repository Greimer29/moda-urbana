import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(150)
const password = () => vine.string().minLength(8).maxLength(255)

/**
 * Login credentials (used in PR #3 feat/api-auth).
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Reserved for future user management — not used in Sprint 1.
 */
export const createUserValidator = vine.create({
  name: vine.string().maxLength(100),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  role: vine.enum(['OPERATOR', 'ADMIN'] as const),
})
