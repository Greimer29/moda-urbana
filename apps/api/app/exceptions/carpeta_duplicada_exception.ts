import { Exception } from '@adonisjs/core/exceptions'

export default class CarpetaDuplicadaException extends Exception {
  static status = 409
  static code = 'E_CARPETA_DUPLICADA'

  constructor() {
    super('Ya existe una carpeta con ese nombre')
  }
}
