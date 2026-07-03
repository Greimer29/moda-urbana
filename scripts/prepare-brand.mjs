import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const APP_IDS = {
  'moda-urbana': 'com.modaurbana.app',
  coreva: 'com.coreva.app',
}

function fail(message) {
  console.error(`prepare-brand: ${message}`)
  process.exit(1)
}

function findFirstExisting(dir, candidates) {
  for (const name of candidates) {
    const fullPath = path.join(dir, name)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }
  return null
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function validateBrandJson(brand, slug) {
  const required = ['appName', 'legalName', 'tagline', 'apiUrl']
  for (const key of required) {
    if (!brand[key] || typeof brand[key] !== 'string' || !brand[key].trim()) {
      fail(`brand.json de "${slug}" requiere "${key}" no vacío.`)
    }
  }

  const apiUrl = brand.apiUrl.trim().replace(/\/$/, '')
  if (!/^https:\/\/.+/.test(apiUrl)) {
    fail(`brand.json de "${slug}": apiUrl debe comenzar con https://`)
  }

  return {
    appName: brand.appName.trim(),
    legalName: brand.legalName.trim(),
    tagline: brand.tagline.trim(),
    apiUrl,
  }
}

function generateElectronBuilderYml({ appId, productName, releaseOutput }) {
  return `appId: ${appId}
productName: ${productName}
icon: resources/icon.ico
directories:
  output: ${releaseOutput}
files:
  - dist/**/*
  - package.json
  - resources/icon.ico
extraResources:
  - from: ../web/dist
    to: web-dist
    filter:
      - '**/*'
  - from: api-url.json
    to: api-url.json
  - from: brand-meta.json
    to: brand-meta.json
extraFiles:
  - from: api-url.json
    to: api-url.json
  - from: brand-meta.json
    to: brand-meta.json
afterPack: scripts/after-pack.cjs
win:
  target: nsis
  icon: resources/icon.ico
  signAndEditExecutable: false
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
`
}

function runRoundIcon(desktopDir) {
  const scriptPath = path.join(desktopDir, 'scripts', 'round-icon.ps1')
  if (!fs.existsSync(scriptPath)) {
    fail(`No se encontró ${scriptPath}`)
  }

  execSync(
    `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
    { cwd: desktopDir, stdio: 'inherit' }
  )
}

const slug = process.argv[2]?.trim()
if (!slug) {
  fail('Uso: node scripts/prepare-brand.mjs <slug>  (ej. moda-urbana, coreva)')
}

const brandDir = path.join(rootDir, 'apps', 'web', 'brands', slug)
if (!fs.existsSync(brandDir)) {
  fail(`No existe la carpeta de marca: ${brandDir}`)
}

const brandJsonPath = path.join(brandDir, 'brand.json')
if (!fs.existsSync(brandJsonPath)) {
  fail(`No existe ${brandJsonPath}`)
}

const brand = validateBrandJson(JSON.parse(fs.readFileSync(brandJsonPath, 'utf8')), slug)
const appId = APP_IDS[slug] ?? `com.${slug.replace(/-/g, '')}.app`
const releaseOutput = `release-${slug}`

const logoPath = findFirstExisting(brandDir, [
  `${slug}_logo.png`,
  `${slug}-logo.png`,
  'logo.png',
])
const bgPath = findFirstExisting(brandDir, [
  `${slug}_bg.png`,
  `${slug}_bg.jpg`,
  `${slug}-bg.png`,
  `${slug}-bg.jpg`,
  'bg.png',
  'bg.jpg',
])
const panelPath = findFirstExisting(brandDir, [`${slug}-panel-reportes.png`, 'panel-reportes.png'])
const iconPath = findFirstExisting(brandDir, ['icon.ico.png', 'icon.png']) ?? logoPath

if (!logoPath) fail(`Falta logo en ${brandDir} (${slug}_logo.png)`)
if (!bgPath) fail(`Falta fondo de login en ${brandDir} (${slug}_bg.png)`)
if (!panelPath) fail(`Falta panel de reportes en ${brandDir} (${slug}-panel-reportes.png)`)
if (!iconPath) fail(`Falta icono o logo en ${brandDir}`)

const publicBrandDir = path.join(rootDir, 'apps', 'web', 'public', 'brand')
if (fs.existsSync(publicBrandDir)) {
  fs.rmSync(publicBrandDir, { recursive: true, force: true })
}
ensureDir(publicBrandDir)

fs.copyFileSync(logoPath, path.join(publicBrandDir, 'logo.png'))
fs.copyFileSync(bgPath, path.join(publicBrandDir, 'login-bg.png'))
fs.copyFileSync(panelPath, path.join(publicBrandDir, 'panel-reportes.png'))

const webEnvPath = path.join(rootDir, 'apps', 'web', '.env.brand.local')
const envLines = [
  `VITE_BRAND_SLUG=${slug}`,
  `VITE_BRAND_APP_NAME=${brand.appName}`,
  `VITE_BRAND_LEGAL_NAME=${brand.legalName}`,
  `VITE_BRAND_TAGLINE=${brand.tagline}`,
  `VITE_API_URL=${brand.apiUrl}`,
  '',
]
fs.writeFileSync(webEnvPath, envLines.join('\n'), 'utf8')

const desktopDir = path.join(rootDir, 'apps', 'desktop')
writeJson(path.join(desktopDir, 'api-url.json'), { apiUrl: brand.apiUrl })

const brandMeta = {
  slug,
  appName: brand.appName,
  legalName: brand.legalName,
  tagline: brand.tagline,
  apiUrl: brand.apiUrl,
  productName: brand.legalName,
  appId,
  releaseOutput,
}
writeJson(path.join(desktopDir, 'brand-meta.json'), brandMeta)

const resourcesDir = path.join(desktopDir, 'resources')
ensureDir(resourcesDir)
fs.copyFileSync(iconPath, path.join(resourcesDir, 'icon.png'))

fs.writeFileSync(
  path.join(desktopDir, 'electron-builder.brand.yml'),
  generateElectronBuilderYml({ appId, productName: brand.legalName, releaseOutput }),
  'utf8'
)

console.log(`prepare-brand: marca "${slug}" (${brand.legalName})`)
console.log(`  API: ${brand.apiUrl}`)
console.log(`  Release: apps/desktop/${releaseOutput}/`)
console.log(`  Assets: apps/web/public/brand/`)
console.log(`  Env: apps/web/.env.brand.local`)

runRoundIcon(desktopDir)
console.log('prepare-brand: listo.')
