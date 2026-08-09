import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoTallaNoEncontradaException extends Exception {
  static status = 404
  static code = 'PRODUCTO_TALLA_NO_ENCONTRADA'
  static message = 'Talla de producto no encontrada'
}
