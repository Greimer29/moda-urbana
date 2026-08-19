import { describe, expect, it } from 'vitest'

import { formatFecha, isoToBusinessDate } from './format-date'

describe('isoToBusinessDate', () => {
  it('returns plain ISO dates unchanged', () => {
    expect(isoToBusinessDate('2026-06-16')).toBe('2026-06-16')
  })

  it('uses Caracas calendar for UTC datetimes after 20:00 local', () => {
    expect(isoToBusinessDate('2026-08-19T01:00:00.000Z')).toBe('2026-08-18')
  })
})

describe('formatFecha', () => {
  it('formats date-only ISO strings', () => {
    expect(formatFecha('2026-06-16')).toBe('16/06/2026')
  })

  it('formats datetime ISO strings using the Caracas business date', () => {
    expect(formatFecha('2026-06-14T23:49:30.000+00:00')).toBe('14/06/2026')
    expect(formatFecha('2026-08-19T01:00:00.000Z')).toBe('18/08/2026')
  })
})
