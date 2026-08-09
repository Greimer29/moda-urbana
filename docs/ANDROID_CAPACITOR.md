# App Android — Capacitor (Moda Urbana)

Guía para construir e instalar el APK que empaqueta el frontend React con Capacitor y habla con la API pública en Railway.

## Prerrequisitos

| Herramienta | Notas |
|-------------|--------|
| Node 20+ / pnpm 9+ | Ya usados en el monorepo |
| JDK 17+ | Probado con OpenJDK 21 |
| Android SDK | Ruta típica Windows: `%LOCALAPPDATA%\Android\Sdk` |
| Android Studio (recomendado) | SDK 34+, Platform Tools |
| Dispositivo o emulador | USB debugging activado para `adb install` |

Variables de entorno útiles:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
```

El script `apps/mobile/scripts/build-android.mjs` intenta detectar el SDK en `LocalAppData\Android\Sdk` si `ANDROID_HOME` no está seteado.

## Arquitectura

- WebView Capacitor (`https://localhost`) carga el build de `apps/web/dist`
- API: `VITE_API_URL` / brand `apiUrl` → Railway HTTPS
- CORS: `CAPACITOR_APP_ORIGIN=https://localhost` en el servicio API
- Cookies: `SameSite=None; Secure` en producción
- Imágenes autenticadas: blob vía axios (`AuthenticatedImage`)
- Cámara: `@capacitor/camera` en el formulario de productos

## Build APK (debug)

Desde la raíz del repo:

```powershell
cd C:\gapg\Proyects\moda-urbana
pnpm build:android:moda-urbana
```

Esto ejecuta:

1. `prepare-brand` (marca + `capacitor.config.json`)
2. Build web (`vite --mode brand`)
3. `cap sync android` + `gradlew assembleDebug`

APK resultante (típico):

```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Instalar:

```powershell
adb install -r apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

## Build release (interno)

```powershell
pnpm build:android:moda-urbana:release
```

Por defecto usa la firma **debug** de Android hasta configurar un keystore propio. Para producción interna:

1. Generá un keystore **fuera del repo** (nunca lo subas a git).
2. Configurá `apps/mobile/android/keystore.properties` local (ignorado) o variables de firma en `app/build.gradle`.
3. Volvé a correr `build:android:moda-urbana:release`.

## CORS en Railway

Variable requerida en el servicio `moda-urbana`:

| Variable | Valor |
|----------|--------|
| `CAPACITOR_APP_ORIGIN` | `https://localhost` |

Tras cambiar variables, redeploy de la API.

## Checklist de aceptación (dispositivo)

1. Instalar APK y abrir la app
2. Login con admin de producción
3. Ir a **Productos** → **Nuevo producto**
4. **Tomar foto** con la cámara → preview visible
5. Guardar producto → imagen visible en listado/detalle
6. Abrir el mismo producto en web/desktop → misma imagen
7. Cerrar y reabrir la app (sesión según cookies del WebView)

## Troubleshooting

| Síntoma | Qué revisar |
|---------|-------------|
| Login falla / CORS | `CAPACITOR_APP_ORIGIN=https://localhost` en Railway + redeploy |
| Imágenes en negro / error | `AuthenticatedImage` + sesión activa; volume `/data/uploads` |
| Cámara no abre | Permisos CAMERA / fotos en el teléfono; Manifest |
| `ANDROID_HOME` missing | Setear SDK o instalar Android Studio |
| Gradle falla | Abrir `apps/mobile/android` en Android Studio una vez (licencias SDK) |

## Abrir en Android Studio

```powershell
cd apps\mobile
npx cap open android
```

## Fuera de v1

- Google Play / AAB firmado de tienda
- iOS
- Offline sync
