# Moda Urbana — setup rápido

Clon independiente de Hebra. **Hebra no se modifica** (`C:\gapg\Proyects\hebra`).

## Identidad

- Logo: `apps/web/public/moda-urbana-logo.png`
- Fondo login: `apps/web/public/moda-urbana-login-bg.png`

Si tenés versiones propias de esos archivos, reemplazá esos PNG (mismos nombres).

## Desarrollo local (sin chocar con Hebra)

| Servicio | Moda Urbana | Hebra (referencia) |
|----------|---------------|---------------------|
| API | `http://localhost:3334` | `:3333` |
| Web | `http://localhost:5174` | `:5173` |
| MySQL host | `127.0.0.1:3307` | `:3306` |
| BD dev | `moda_urbana` | `hebra` |

```powershell
cd C:\gapg\Proyects\moda-urbana
.\scripts\dev-setup.ps1
npm run dev:api
npm run dev:web
```

Login: `admin@modaurbana.local` (contraseña en `apps/api/.env`).

## Railway (API + MySQL)

1. Proyecto en Railway → repo `Greimer29/moda-urbana`.
2. MySQL `moda-urbana-mysql` + servicio API (mismo repo).
3. **Settings del servicio API** (igual que `hebra-api`):

   | Setting | Valor |
   |---------|--------|
   | Root Directory | *(vacío — raíz del repo)* |
   | **Config-as-code → Railway config file** | `apps/api/railway.toml` *(o `railway.toml` en la raíz)* |
   | Dockerfile Path | *(lo toma del config)* → `apps/api/Dockerfile` |
   | Pre-deploy command | *(lo toma del config)* → `node ace migration:run --force` |

   Si ves `Dockerfile` suelto en la UI (auto-detectado), configurá el **config file** arriba y redeployá.

4. Volume `/data/uploads` + `STORAGE_LOCAL_PATH=/data/uploads`.
5. Variables: `APP_KEY`, `FRONTEND_URL=http://localhost:5174`, `DESKTOP_APP_ORIGIN=http://127.0.0.1:51740`, `ADMIN_*`, `DB_*` referenciando MySQL.
6. Tras el deploy: seed manual → `railway ssh -- node ace db:seed`
7. **Desarrollo y pruebas:** usá API local (`VITE_API_URL=http://localhost:3334` en `apps/web/.env.production`). No apuntes el frontend a Railway salvo smoke puntual de prod.

Ver `docs/RAILWAY_DEPLOY.md` (misma arquitectura; renombrá servicios `hebra-*` → `moda-urbana-*`).

## App de escritorio (Windows)

Instalable `.exe` con Electron. Por defecto apunta a la **API local** (`http://localhost:3334`); la API pública de Railway solo se usa si configurás `api-url.json` o `MODA_URBANA_API_URL` al distribuir el instalador.

### Requisitos

- Node.js 20+
- pnpm 9+
- Windows 10 o superior

### Build del instalador

```powershell
cd C:\gapg\Proyects\moda-urbana
pnpm install
pnpm build:desktop
```

El instalador queda en `apps/desktop/release/Moda Urbana Setup 1.0.0.exe`.

Opcional: colocá `api-url.json` junto al `.exe` para apuntar a Railway en producción (sin recompilar):

```json
{ "apiUrl": "http://localhost:3334" }
```

Por defecto (repo y build local): `http://localhost:3334`. Para distribución contra Railway, cambiá solo ese archivo junto al instalador.

### CORS en Railway (obligatorio para login en desktop)

La app de escritorio sirve el frontend en `http://127.0.0.1:51740`. En Railway, configurá **dos variables** (solo el valor, sin repetir el nombre):

| Variable | Valor |
|----------|--------|
| `FRONTEND_URL` | `http://localhost:5174` |
| `DESKTOP_APP_ORIGIN` | `http://127.0.0.1:51740` |

Redeploy de la API tras cambiar las variables.

### Notas

- Icono de la app: `apps/web/public/moda-urbana-logo.png`
- El instalador no está firmado con certificado de código; Windows SmartScreen puede pedir confirmación al instalar (normal en v1).
- Si el puerto `51740` está ocupado, cerrá otras instancias de Moda Urbana antes de abrir la app.
- Antes de volver a buildear, cerrá la app de escritorio si está abierta (evita error de `app.asar` en uso).

## Repo

- Remoto: https://github.com/Greimer29/moda-urbana.git
