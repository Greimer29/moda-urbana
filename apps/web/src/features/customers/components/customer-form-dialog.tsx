import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TIPO_LABELS } from '@/features/customers/constants'
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@/features/customers/hooks/use-customers'
import type { Customer, CustomerTipo } from '@/features/customers/types'
import { getApiError } from '@/lib/api-error'

const TIPOS = ['WHITE_LABEL', 'CORPORATE', 'OTHER'] as const

const customerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  phone: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .email('Ingresá un email válido')
    .max(150)
    .optional()
    .or(z.literal('')),
  type: z.enum(TIPOS),
  document: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  notes: z.string().trim().optional(),
  credit_days: z.number().min(0).max(365).optional(),
  active: z.boolean().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

type CustomerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onCreated?: (customer: Customer) => void
}

function emptyValues(): CustomerFormValues {
  return {
    name: '',
    phone: '',
    email: '',
    type: 'CORPORATE',
    document: '',
    address: '',
    notes: '',
    credit_days: 0,
    active: true,
  }
}

function toFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    type: customer.type as CustomerTipo,
    document: customer.document ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
    credit_days: customer.creditDays ?? 0,
    active: customer.active,
  }
}

function toPayload(values: CustomerFormValues) {
  return {
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    type: values.type,
    document: values.document?.trim() || undefined,
    address: values.address?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    credit_days: values.credit_days ?? 0,
    ...(values.active !== undefined ? { active: values.active } : {}),
  }
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: CustomerFormDialogProps) {
  const isEditing = customer != null
  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) {
      reset(isEditing ? toFormValues(customer) : emptyValues())
    }
  }, [open, isEditing, customer, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values)

      if (isEditing) {
        await updateMutation.mutateAsync({ id: customer.id, payload })
      } else {
        const created = await createMutation.mutateAsync(payload)
        onCreated?.(created)
      }

      onOpenChange(false)
    } catch (error) {
      setError('root', { message: getApiError(error).message })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualizá los datos del cliente.'
              : 'Cargá los datos del cliente. Teléfono y email se normalizan al guardar.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" autoComplete="organization" {...register('name')} />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <select
              id="type"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              {...register('type')}
            >
              {TIPOS.map((type) => (
                <option key={type} value={type}>
                  {TIPO_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Documento / RIF</Label>
            <Input id="document" placeholder="J-12345678-9" {...register('document')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="0412 833 2238" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_days">Días de crédito</Label>
            <Input
              id="credit_days"
              type="number"
              min={0}
              max={365}
              {...register('credit_days', { valueAsNumber: true })}
            />
            <p className="text-muted-foreground text-xs">0 = sin crédito. Aplica al facturar a crédito.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          {isEditing ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border" {...register('active')} />
              Cliente activo
            </label>
          ) : null}

          {errors.root ? <p className="text-destructive text-sm">{errors.root.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Guardando…
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
