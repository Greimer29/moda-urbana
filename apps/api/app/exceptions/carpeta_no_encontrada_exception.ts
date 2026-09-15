import { Exception } from '@adonisjs/core/exceptions'

export default class CarpetaNoEncontradaException extends Exception {
  static status = 404
  static code = 'E_CARPETA_NO_ENCONTRADA'

  constructor() {
    super('Carpeta no encontrada')
  }
}
