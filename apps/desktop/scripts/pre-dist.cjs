const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const releaseDir = path.join(__dirname, '..', 'release')

try {
  execSync('taskkill /F /IM "Moda Urbana.exe" /T', { stdio: 'ignore' })
} catch {
  // App not running.
}

if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })
}
