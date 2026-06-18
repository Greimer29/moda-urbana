import * as React from 'react'

import { Input } from '@/components/ui/input'
import { formatDecimalOnBlur, sanitizeDecimalInput } from '@/lib/numeric-input'

export type DecimalInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'step' | 'inputMode'
> & {
  /** Máximo de decimales permitidos al escribir (por defecto 2). */
  decimals?: number
  /** Incremento de las flechas del input (por defecto 1 = entero). */
  step?: number
}

/**
 * Input numérico con límite de decimales y flechas que suben/bajan de a 1 unidad entera.
 */
export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  function DecimalInput({ decimals = 2, step = 1, onChange, onBlur, ...props }, ref) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeDecimalInput(e.target.value, decimals)
      if (sanitized !== e.target.value) {
        e.target.value = sanitized
      }
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const formatted = formatDecimalOnBlur(e.target.value, decimals)
      if (formatted !== e.target.value) {
        e.target.value = formatted
        onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>)
      }
      onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="number"
        step={step}
        inputMode="decimal"
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)

/** Alias para montos en USD/Bs (2 decimales, flechas de a 1). */
export const MoneyInput = DecimalInput
