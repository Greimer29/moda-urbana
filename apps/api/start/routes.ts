/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import FormulasController from '#controllers/formulas_controller'
import CatalogProductsController from '#controllers/catalog_products_controller'
import SalesController from '#controllers/sales_controller'
import ExpensesController from '#controllers/expenses_controller'
import SettingsController from '#controllers/settings_controller'
import AccountsController from '#controllers/accounts_controller'
import CurrenciesController from '#controllers/currencies_controller'
import ReportsController from '#controllers/reports_controller'
import CategoriesController from '#controllers/categories_controller'
import CsrfController from '#controllers/csrf_controller'

router.get('/health', [controllers.Health, 'show'])

router
  .group(() => {
    router.get('csrf', [CsrfController, 'show'])
    router.post('auth/login', [controllers.Auth, 'login'])

    router.get('catalog-products/:id/image', [CatalogProductsController, 'downloadImage'])
    router.get('materials/:id/image', [controllers.Materials, 'downloadImage'])
    router.get('suppliers/:id/image', [controllers.Suppliers, 'downloadImage'])
    router.get('customers/:id/image', [controllers.Customers, 'downloadImage'])

    router
      .group(() => {
        router.post('auth/logout', [controllers.Auth, 'logout'])
        router.get('auth/me', [controllers.Auth, 'me'])

        router.get('customers', [controllers.Customers, 'index'])
        router.get('customers/:id/account-statement', [controllers.Customers, 'accountStatement'])
        router.get('customers/:id', [controllers.Customers, 'show'])
        router.post('customers', [controllers.Customers, 'store'])
        router.put('customers/:id', [controllers.Customers, 'update'])
        router.delete('customers/:id', [controllers.Customers, 'destroy'])
        router.post('customers/:id/image', [controllers.Customers, 'uploadImage'])
        router.delete('customers/:id/image', [controllers.Customers, 'deleteImage'])
        router.post('customers/:id/payments', [controllers.Customers, 'storePayment'])

        router.get('orders', [controllers.Orders, 'index'])
        router.get('orders/:id', [controllers.Orders, 'show'])
        router.post('orders', [controllers.Orders, 'store'])
        router.put('orders/:id', [controllers.Orders, 'update'])
        router.delete('orders/:id', [controllers.Orders, 'destroy'])
        router.post('orders/:id/transition', [controllers.Orders, 'transition'])
        router.post('orders/:id/return', [controllers.Orders, 'devolver'])
        router.post('orders/:id/materials', [controllers.Orders, 'storeMaterial'])
        router.put('orders/:id/materials/:pmId', [controllers.Orders, 'updateMaterial'])
        router.delete('orders/:id/materials/:pmId', [controllers.Orders, 'destroyMaterial'])
        router.post('orders/:id/lines', [controllers.Orders, 'storeLine'])
        router.put('orders/:id/lines/:lineId', [controllers.Orders, 'updateLine'])
        router.delete('orders/:id/lines/:lineId', [controllers.Orders, 'destroyLine'])
        router.get('orders/:id/budget', [controllers.Orders, 'budget'])
        router.get('orders/:id/material-availability', [controllers.Orders, 'materialAvailability'])
        router.post('orders/:id/reference', [controllers.Orders, 'uploadReferencia'])
        router.get('orders/:id/reference', [controllers.Orders, 'downloadReferencia'])

        router.get('suppliers', [controllers.Suppliers, 'index'])
        router.get('suppliers/:id', [controllers.Suppliers, 'show'])
        router.post('suppliers', [controllers.Suppliers, 'store'])
        router.put('suppliers/:id', [controllers.Suppliers, 'update'])
        router.delete('suppliers/:id', [controllers.Suppliers, 'destroy'])
        router.post('suppliers/:id/image', [controllers.Suppliers, 'uploadImage'])
        router.delete('suppliers/:id/image', [controllers.Suppliers, 'deleteImage'])
        router.get('suppliers/:id/account-statement', [controllers.Suppliers, 'accountStatement'])
        router.post('suppliers/:id/payments', [controllers.Suppliers, 'storePayment'])

        router.get('materials', [controllers.Materials, 'index'])
        router.get('materials/:id', [controllers.Materials, 'show'])
        router.post('materials', [controllers.Materials, 'store'])
        router.put('materials/:id', [controllers.Materials, 'update'])
        router.delete('materials/:id', [controllers.Materials, 'destroy'])
        router.post('materials/:id/adjustment', [controllers.Materials, 'ajuste'])
        router.get('materials/:id/price-history', [controllers.Materials, 'historialPrecios'])
        router.post('materials/:id/image', [controllers.Materials, 'uploadImage'])
        router.delete('materials/:id/image', [controllers.Materials, 'deleteImage'])

        router.get('purchases/summary', [controllers.Purchases, 'summary'])
        router.get('purchases', [controllers.Purchases, 'index'])
        router.get('purchases/:id', [controllers.Purchases, 'show'])
        router.post('purchases', [controllers.Purchases, 'store'])
        router.put('purchases/:id', [controllers.Purchases, 'update'])
        router.delete('purchases/:id', [controllers.Purchases, 'destroy'])
        router.post('purchases/:id/confirm', [controllers.Purchases, 'confirmar'])
        router.post('purchases/:id/return', [controllers.Purchases, 'devolver'])
        router.post('purchases/:id/invoice', [controllers.Purchases, 'uploadFactura'])
        router.get('purchases/:id/invoice', [controllers.Purchases, 'downloadFactura'])
        router.post('purchases/:id/items', [controllers.Purchases, 'storeItem'])
        router.put('purchases/:id/items/:itemId', [controllers.Purchases, 'updateItem'])
        router.delete('purchases/:id/items/:itemId', [controllers.Purchases, 'destroyItem'])

        router.get('expenses/summary', [ExpensesController, 'summary'])
        router.get('expenses', [ExpensesController, 'index'])
        router.post('expenses', [ExpensesController, 'store'])
        router.put('expenses/:id', [ExpensesController, 'update'])
        router.delete('expenses/:id', [ExpensesController, 'destroy'])

        router.get('accounts', [AccountsController, 'index'])
        router.get('accounts/:id', [AccountsController, 'show'])
        router.post('accounts', [AccountsController, 'store'])
        router.put('accounts/:id', [AccountsController, 'update'])
        router.delete('accounts/:id', [AccountsController, 'destroy'])

        router.get('currencies', [CurrenciesController, 'index'])
        router.post('currencies', [CurrenciesController, 'store'])
        router.put('currencies/:code', [CurrenciesController, 'update'])
        router.delete('currencies/:code', [CurrenciesController, 'destroy'])

        router.get('categories', [CategoriesController, 'index'])
        router.post('categories', [CategoriesController, 'store'])
        router.put('categories/:id', [CategoriesController, 'update'])
        router.delete('categories/:id', [CategoriesController, 'destroy'])

        router.get('reports/account-statement', [ReportsController, 'accountStatement'])

        router.get('settings/exchange-rate', [SettingsController, 'getExchangeRate'])
        router.put('settings/exchange-rate', [SettingsController, 'updateExchangeRate'])
        router.get('settings/profit-margin', [SettingsController, 'getProfitMargin'])
        router.put('settings/profit-margin', [SettingsController, 'updateProfitMargin'])

        router.get('dashboard/summary', [controllers.Dashboard, 'resumen'])
        router.get('dashboard/overview', [controllers.Dashboard, 'overview'])
        router.get('dashboard/daily-product-sales', [controllers.Dashboard, 'dailyProductSales'])
        router.get('dashboard/daily-expenses', [controllers.Dashboard, 'dailyExpenses'])

        router.get('machines', [controllers.Machines, 'index'])
        router.get('machines/:id', [controllers.Machines, 'show'])
        router.post('machines', [controllers.Machines, 'store'])
        router.put('machines/:id', [controllers.Machines, 'update'])
        router.delete('machines/:id', [controllers.Machines, 'destroy'])
        router.get('machines/:id/expenses', [controllers.Machines, 'indexExpenses'])
        router.post('machines/:id/expenses', [controllers.Machines, 'storeExpense'])

        router.get('machine-expenses', [controllers.MachineExpenses, 'index'])
        router.put('machine-expenses/:id', [controllers.MachineExpenses, 'update'])
        router.delete('machine-expenses/:id', [controllers.MachineExpenses, 'destroy'])
        router.post('machine-expenses/:id/receipt', [
          controllers.MachineExpenses,
          'uploadComprobante',
        ])
        router.get('machine-expenses/:id/receipt', [
          controllers.MachineExpenses,
          'downloadComprobante',
        ])

        router.get('catalog-products', [CatalogProductsController, 'index'])
        router.post('catalog-products/apply-profit-margin', [
          CatalogProductsController,
          'applyProfitMargin',
        ])
        router.get('catalog-products/:id', [CatalogProductsController, 'show'])
        router.post('catalog-products/:id/adjustment', [CatalogProductsController, 'ajuste'])
        router.post('catalog-products', [CatalogProductsController, 'store'])
        router.put('catalog-products/:id', [CatalogProductsController, 'update'])
        router.delete('catalog-products/:id', [CatalogProductsController, 'destroy'])
        router.post('catalog-products/:id/image', [CatalogProductsController, 'uploadImage'])
        router.delete('catalog-products/:id/image', [CatalogProductsController, 'deleteImage'])

        router.get('formulas', [FormulasController, 'index'])
        router.get('formulas/:id', [FormulasController, 'show'])
        router.post('formulas', [FormulasController, 'store'])
        router.put('formulas/:id', [FormulasController, 'update'])
        router.delete('formulas/:id', [FormulasController, 'destroy'])
        router.get('formulas/:id/materials', [FormulasController, 'getMaterials'])
        router.put('formulas/:id/materials', [FormulasController, 'updateMaterials'])

        router.get('sales', [SalesController, 'index'])
        router.get('sales/:id', [SalesController, 'show'])
        router.post('sales', [SalesController, 'store'])
      })
      .use(middleware.auth({ guards: ['web'] }))
  })
  .prefix('/api/v1')
