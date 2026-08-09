import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mobileDir = path.resolve(__dirname, '..')
const androidDir = path.join(mobileDir, 'android')
const mode = (process.argv[2] ?? 'debug').toLowerCase()

if (!['debug', 'release'].includes(mode)) {
  console.error('Uso: node scripts/build-android.mjs [debug|release]')
  process.exit(1)
}

if (!fs.existsSync(androidDir)) {
  console.error('No existe apps/mobile/android. Ejecutá: pnpm --filter mobile exec cap add android')
  process.exit(1)
}

const sdkDefault = path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
if (!process.env.ANDROID_HOME && fs.existsSync(sdkDefault)) {
  process.env.ANDROID_HOME = sdkDefault
  process.env.ANDROID_SDK_ROOT = sdkDefault
}

if (!process.env.ANDROID_HOME) {
  console.error('ANDROID_HOME no está configurado y no se encontró el SDK en LocalAppData\\Android\\Sdk')
  process.exit(1)
}

const localProperties = path.join(androidDir, 'local.properties')
const sdkPath = process.env.ANDROID_HOME.replace(/\\/g, '/')
fs.writeFileSync(localProperties, `sdk.dir=${sdkPath.replace(/:/g, '\\:')}\n`, 'utf8')

execSync('npx cap sync android', { cwd: mobileDir, stdio: 'inherit', env: process.env })

const gradleTask = mode === 'release' ? 'assembleRelease' : 'assembleDebug'
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'

execSync(`${gradlew} ${gradleTask}`, {
  cwd: androidDir,
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

const apkDir =
  mode === 'release'
    ? path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release')
    : path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug')

const apk = fs.existsSync(apkDir)
  ? fs.readdirSync(apkDir).find((name) => name.endsWith('.apk'))
  : null

console.log('')
console.log(`build-android: ${mode} listo.`)
if (apk) {
  console.log(`APK: ${path.join(apkDir, apk)}`)
} else {
  console.log(`Buscá el APK en: ${apkDir}`)
}
