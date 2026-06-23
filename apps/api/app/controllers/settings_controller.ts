import AppSettingsService from '#services/app_settings_service'
import { updateExchangeRateValidator, updateProfitMarginValidator } from '#validators/settings'
import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  private service = new AppSettingsService()

  async getExchangeRate({ serialize }: HttpContext) {
    const usdRate = await this.service.getExchangeRate()

    return serialize({
      usdRate: usdRate !== null ? usdRate.toFixed(4) : null,
    })
  }

  async updateExchangeRate({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateExchangeRateValidator)
    const saved = await this.service.setExchangeRate(payload.usd_rate)

    return serialize({
      usdRate: saved.toFixed(4),
    })
  }

  async getProfitMargin({ serialize }: HttpContext) {
    const profitMarginPercent = await this.service.getProfitMarginPercent()

    return serialize({
      profitMarginPercent: profitMarginPercent !== null ? profitMarginPercent.toFixed(2) : null,
    })
  }

  async updateProfitMargin({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateProfitMarginValidator)
    const saved = await this.service.setProfitMarginPercent(payload.profit_margin_percent)

    return serialize({
      profitMarginPercent: saved.toFixed(2),
    })
  }
}
