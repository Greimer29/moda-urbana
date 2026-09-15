import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoYaEnCarpetaException extends Exception {
  static status = 409
  static code = 'E_PRODUCTO_YA_EN_CARPETA'

  constructor() {
    super('El producto ya está en esta carpeta')
  }
}
