export type BrandConfig = {
  slug: string
  appName: string
  legalName: string
  tagline: string
  logoUrl: string
  loginBgUrl: string
  reportsPanelUrl: string
}

function requireEnv(value: string | undefined, key: string): string {
  if (!value?.trim()) {
    throw new Error(
      `Falta ${key}. Ejecutá: node scripts/prepare-brand.mjs <slug> (ej. moda-urbana, coreva)`
    )
  }
  return value.trim()
}

export const brand: BrandConfig = {
  slug: requireEnv(import.meta.env.VITE_BRAND_SLUG, 'VITE_BRAND_SLUG'),
  appName: requireEnv(import.meta.env.VITE_BRAND_APP_NAME, 'VITE_BRAND_APP_NAME'),
  legalName: requireEnv(import.meta.env.VITE_BRAND_LEGAL_NAME, 'VITE_BRAND_LEGAL_NAME'),
  tagline: requireEnv(import.meta.env.VITE_BRAND_TAGLINE, 'VITE_BRAND_TAGLINE'),
  logoUrl: '/brand/logo.png',
  loginBgUrl: '/brand/login-bg.png',
  reportsPanelUrl: '/brand/panel-reportes.png',
}

export function applyBrandDocumentMeta(): void {
  document.title = brand.legalName

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.type = 'image/png'
    document.head.appendChild(favicon)
  }
  favicon.href = brand.logoUrl
}
