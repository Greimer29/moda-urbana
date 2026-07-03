import { LoginForm } from '@/features/auth/components/login-form'
import { brand } from '@/lib/brand-config'

export function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <img
        src={brand.loginBgUrl}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/50" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
}
