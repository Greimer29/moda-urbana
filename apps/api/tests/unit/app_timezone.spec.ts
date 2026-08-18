import { nowInAppZone, todayIsoDate } from '#utils/app_timezone'
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
})
