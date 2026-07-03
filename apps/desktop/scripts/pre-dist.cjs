const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const desktopDir = path.join(__dirname, '..')

let productName = 'Moda Urbana'
let releaseOutput = 'release-moda-urbana'

const brandMetaPath = path.join(desktopDir, 'brand-meta.json')
if (fs.existsSync(brandMetaPath)) {
  try {
    const meta = JSON.parse(fs.readFileSync(brandMetaPath, 'utf8'))
    if (meta.productName?.trim()) {
      productName = meta.productName.trim()
    } else if (meta.legalName?.trim()) {
      productName = meta.legalName.trim()
    }
    if (meta.releaseOutput?.trim()) {
      releaseOutput = meta.releaseOutput.trim()
    } else if (meta.slug?.trim()) {
      releaseOutput = `release-${meta.slug.trim()}`
    }
  } catch {
    // Usar fallback.
  }
}

const releaseDir = path.join(desktopDir, releaseOutput)

try {
  execSync(`taskkill /F /IM "${productName}.exe" /T`, { stdio: 'ignore' })
} catch {
  // App not running.
}

if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })
}
