import {
  buildPriceAdjustmentNote,
  mergeLineNotes,
} from '#utils/price_adjustment_note'
import { test } from '@japa/runner'

test.group('price_adjustment_note', () => {
  test('builds a discount note when sold price is below list', ({ assert }) => {
    assert.equal(
      buildPriceAdjustmentNote(100, 80),
      'Ajuste de precio: descuento de 20,00 USD (lista 100,00 → 80,00)'
    )
  })

  test('builds an increase note when sold price is above list', ({ assert }) => {
    assert.equal(
      buildPriceAdjustmentNote(50, 60),
      'Ajuste de precio: aumento de 10,00 USD (lista 50,00 → 60,00)'
    )
  })

  test('returns null when prices match within a cent', ({ assert }) => {
    assert.isNull(buildPriceAdjustmentNote(25, 25))
    assert.isNull(buildPriceAdjustmentNote(25.001, 25.004))
  })

  test('keeps user notes and replaces a previous auto adjustment', ({ assert }) => {
    const previous =
      'Cliente habitual\nAjuste de precio: descuento de 5,00 USD (lista 100,00 → 95,00)'
    const next = buildPriceAdjustmentNote(100, 80)

    assert.equal(
      mergeLineNotes(previous, next),
      'Cliente habitual\nAjuste de precio: descuento de 20,00 USD (lista 100,00 → 80,00)'
    )
  })

  test('drops the auto note when price returns to list', ({ assert }) => {
    assert.equal(
      mergeLineNotes(
        'Cliente habitual\nAjuste de precio: aumento de 10,00 USD (lista 50,00 → 60,00)',
        null
      ),
      'Cliente habitual'
    )
  })
})
