/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_BRAND_SLUG: string
  readonly VITE_BRAND_APP_NAME: string
  readonly VITE_BRAND_LEGAL_NAME: string
  readonly VITE_BRAND_TAGLINE: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_BUILD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
