import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function rewriteProxyCookies(proxy: {
  on(
    event: 'proxyRes',
    handler: (proxyRes: { headers: Record<string, string | string[] | undefined> }) => void
  ): void
}) {
  proxy.on('proxyRes', (proxyRes) => {
    const raw = proxyRes.headers['set-cookie']
    if (!raw) {
      return
    }

    proxyRes.headers['set-cookie'] = (Array.isArray(raw) ? raw : [raw]).map((cookie) =>
      cookie
        .replace(/;\s*Domain=[^;]*/gi, '')
        .replace(/;\s*Secure/gi, '')
        .replace(/;\s*SameSite=[^;]*/gi, '; SameSite=Lax')
    )
  })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiUrl =
    env.VITE_API_URL || 'https://moda-urbana-production.up.railway.app'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      host: 'localhost',
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: true,
          configure: rewriteProxyCookies,
        },
      },
    },
  }
})
