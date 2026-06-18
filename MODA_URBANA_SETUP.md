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

1. Proyecto nuevo en Railway → repo `Greimer29/moda-urbana`.
2. MySQL `moda-urbana-mysql` + API con `apps/api/Dockerfile`.
3. Volume `/data/uploads` + `STORAGE_LOCAL_PATH=/data/uploads`.
4. `APP_KEY` nuevo, `FRONTEND_URL=http://localhost:5174`.
5. Tras el deploy, en `apps/web/.env`: `VITE_API_URL=https://<tu-api-railway>`.

Ver `docs/RAILWAY_DEPLOY.md` (misma arquitectura; renombrá servicios `hebra-*` → `moda-urbana-*`).

## Repo

- Remoto: https://github.com/Greimer29/moda-urbana.git
