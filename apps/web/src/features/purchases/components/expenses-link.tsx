import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { gastosUrl } from '@/features/purchases/constants'

type ExpensesLinkProps = {
  variant?: 'default' | 'outline' | 'ghost'
}

export function ExpensesLink({ variant = 'outline' }: ExpensesLinkProps) {
  return (
    <PermissionGate permission="expenses.view">
      <Button variant={variant} size="icon" asChild>
        <Link to={gastosUrl({ nuevo: true })} title="Gastos" aria-label="Gastos">
          <Wallet className="size-4" />
        </Link>
      </Button>
    </PermissionGate>
  )
}
