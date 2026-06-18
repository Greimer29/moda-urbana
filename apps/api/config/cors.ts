import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

function frontendOrigins(): string[] {
  const origins = [env.get('FRONTEND_URL')]
  const desktopOrigin = env.get('DESKTOP_APP_ORIGIN')

  if (desktopOrigin) {
    origins.push(desktopOrigin)
  }

  return origins
}

const corsConfig = defineConfig({
  enabled: true,
  origin: frontendOrigins(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
