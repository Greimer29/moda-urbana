import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoTallaDuplicadaException extends Exception {
  static status = 422
  static code = 'PRODUCTO_TALLA_DUPLICADA'
  static message = 'Hay tallas duplicadas en el producto'

  constructor(size: string) {
    super(`Talla duplicada: ${size}`, {
      status: 422,
      code: 'PRODUCTO_TALLA_DUPLICADA',
    })
  }
}
