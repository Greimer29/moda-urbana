import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModaUrbanaIdentity } from '@/features/auth/components/moda-urbana-identity'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    setIsLoggingIn(true)

    try {
      await login(values.email, values.password)
      const redirectTo =
        (location.state as { from?: string } | null)?.from?.replace(/\/login\/?$/, '') ||
        '/dashboard'
      navigate(redirectTo === '/login' ? '/dashboard' : redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(getApiError(error).message)
    } finally {
      setIsLoggingIn(false)
    }
  })

  return (
    <div className="login-form-enter login-glass-body flex min-h-[550px] w-full max-w-md flex-col rounded-2xl border border-white/15 px-6 py-8 shadow-[0_24px_64px_rgb(0_0_0_/_0.35)] sm:px-8">
      <ModaUrbanaIdentity />

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Ingresa tu email"
                disabled={isLoggingIn}
                className="login-input h-11 shadow-none pl-10"
                {...register('email')}
              />
            </div>
            {errors.email ? (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                disabled={isLoggingIn}
                className="login-input h-11 pr-10 pl-10 shadow-none"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-200"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={isLoggingIn}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            ) : null}
          </div>

          {submitError ? (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
              aria-live="polite"
            >
              {submitError}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={isLoggingIn}
            className={cn(
              'h-11 w-full rounded-lg border-0 text-sm font-semibold tracking-wide',
              'bg-white text-neutral-950 hover:bg-neutral-100'
            )}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="animate-spin" />
                Ingresando…
              </>
            ) : (
              'INGRESAR'
            )}
          </Button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} Moda Urbana. Todos los derechos reservados.
      </p>
    </div>
  )
}
