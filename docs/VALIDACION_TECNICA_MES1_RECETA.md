# Validación técnica — Mes 1 receta + stock

- **Fecha:** 2026-06-18T17:25:58.545Z
- **Entorno:** http://localhost:3334
- **Modo:** local
- **Resultado:** PASS (20/20 pasos OK)

## Pasos

| Paso | Resultado | Detalle |
|------|-----------|---------|
| Entorno | OK | local @ http://localhost:3334 |
| Health check | OK | status 200 |
| Login | OK | admin@modaurbana.local |
| Listar proveedores (seeder) | OK |  |
| Crear cliente | OK | id 3 |
| Crear 2 materiales | OK |  |
| Ajustar stock inicial | OK |  |
| Crear pedido | OK | id 7 |
| Agregar receta (2 materiales) | OK |  |
| Detalle pedido incluye receta | OK | items 2 |
| Transición a CONFIRMED | OK |  |
| Transición a IN_PRODUCTION | OK |  |
| Stock bajó al producir | OK | 500 -> 490 (esperado -10 en tela A) |
| Transición a DELIVERED | OK |  |
| Stock insuficiente devuelve 409 | OK | status 409 |
| Forzar producción sin stock | OK |  |
| Cancelación revierte stock | OK | 175 -> 195 |
| Crear máquina | OK | id 3 |
| Registrar gasto de máquina | OK |  |
| Dashboard resumen | OK | status 200 |
