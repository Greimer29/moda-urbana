import SalesShift from '#models/sales_shift'
import type User from '#models/user'
import { DateTime } from 'luxon'

/** Ensures a single OPEN sales shift for functional tests that confirm orders. */
export async function ensureOpenSalesShift(user: User) {
  const existing = await SalesShift.query().where('status', 'OPEN').first()
  if (existing) {
    return existing
  }

  return SalesShift.create({
    openedAt: DateTime.now(),
    closedAt: null,
    openedByUserId: Number(user.id),
    closedByUserId: null,
    status: 'OPEN',
    notes: 'test-shift',
  })
}
