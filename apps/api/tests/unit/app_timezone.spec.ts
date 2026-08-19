import { dayEndInAppZone, dayStartInAppZone, nowInAppZone, todayIsoDate } from '#utils/app_timezone'
import { test } from '@japa/runner'

test.group('app_timezone', () => {
  test('uses America/Caracas (UTC-4, no DST)', ({ assert }) => {
    const now = nowInAppZone()
    assert.equal(now.zoneName, 'America/Caracas')
    assert.equal(now.offset, -240)
  })

  test('todayIsoDate matches the Caracas calendar date, not UTC after 20:00 VE', ({ assert }) => {
    const utc = nowInAppZone().toUTC()
    const caracasDate = todayIsoDate()
    const utcDate = utc.toISODate()!

    if (utc.hour < 4) {
      assert.notEqual(caracasDate, utcDate)
      assert.equal(caracasDate, utc.minus({ days: 1 }).toISODate())
    } else {
      assert.equal(caracasDate, utcDate)
    }
  })

  test('dayStartInAppZone and dayEndInAppZone bound the Caracas calendar day in UTC', ({
    assert,
  }) => {
    const start = dayStartInAppZone('2026-08-18').toUTC()
    const end = dayEndInAppZone('2026-08-18').toUTC()

    assert.equal(start.toISO(), '2026-08-18T04:00:00.000Z')
    assert.equal(end.toISO(), '2026-08-19T03:59:59.999Z')
  })
})
