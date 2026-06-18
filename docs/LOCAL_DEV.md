# Desarrollo local — Hebra (Sprint 2+)

Guía para trabajar **solo en local** (API + MySQL + web). Railway queda para pruebas de deploy al cerrar un sprint o antes de entregar al dueño.

## Arquitectura local

| Componente     | URL / puerto                                                |
| -------------- | ----------------------------------------------------------- |
| MySQL (Docker) | `127.0.0.1:3306` — user `hebra` / pass `hebra` / DB `hebra` |
| API (Adonis)   | `http://localhost:3333`                                     |
| Web (Vite)     | `http://localhost:5173`                                     |

## Requisitos

- Node.js >= 20
- pnpm >= 9 **opcional** — los scripts del repo usan `npx pnpm@9.15.4` vía `npm run …`
- Docker Desktop (para MySQL)

## Setup inicial (una vez)

Desde la raíz del repo:

```powershell
cd c:\gapg\Proyects\hebra   # raíz del repo (no apps\)
npm install
npx pnpm@9.15.4 install
Copy-Item apps\api\.env.example apps\api\.env   # si no existe
Copy-Item apps\web\.env.example apps\web\.env # si no existe
```

En `apps\api\.env`:

1. Generar `APP_KEY` si está vacía:

   ```powershell
   cd apps\api
   node ace generate:key
   ```

2. Credenciales admin locales (por defecto en `.env.example`):
   - `ADMIN_EMAIL=admin@hebra.local`
   - `ADMIN_PASSWORD=change-me-in-production` _(cambiá a algo cómodo para dev, ej. `hebra-dev`)_

En `apps\web\.env`:

```env
VITE_API_URL=http://localhost:3333
```

**No uses la URL de Railway** mientras desarrollás Sprint 2.

### Script automático

```powershell
.\scripts\dev-setup.ps1
```

Levanta MySQL, corre migraciones y seed del admin.

## Día a día

**Terminal 1 — base de datos** (solo si no está corriendo):

```powershell
docker compose up -d mysql
```

**Terminal 2 — API:**

```powershell
cd c:\gapg\Proyects\hebra
npm run dev:api
```

**Terminal 3 — Web:**

```powershell
cd c:\gapg\Proyects\hebra
npm run dev:web
```

Abrir: `http://localhost:5173/login`

## Comandos útiles

```powershell
# Nueva migración (desde apps/api)
cd apps\api
node ace make:migration nombre_tabla

# Aplicar migraciones
node ace migration:run

# Rollback último batch
node ace migration:rollback

# Tests API (usan BD `hebra_test`, no tocan `hebra` de dev)
cd apps\api
node ace test
# o desde raíz:
npm run test --workspace=api   # si existe en package.json root
npx pnpm@9.15.4 --filter api test

# Lint / typecheck monorepo
pnpm lint
pnpm typecheck
```

## Uploads (Sprint 2 — facturas de compra)

Variables en `apps/api/.env`:

- `DRIVE_DISK=local`
- `STORAGE_LOCAL_PATH=./storage/uploads`

Los archivos se guardan en `apps/api/storage/uploads/` (ignorados por git). En local no hace falta Railway ni egress.

## Base de datos de tests (`hebra_test`)

Los tests funcionales de la API **no usan** la base `hebra` de desarrollo.

| Base | Uso |
| ---- | --- |
| `hebra` | Dev (`npm run dev:api`), seed admin, datos del dueño |
| `hebra_test` | Solo `node ace test` (config en `apps/api/.env.test`) |

Al correr tests, Japa (`bin/test.ts`):

1. Fija `NODE_ENV=test` y `DB_DATABASE=hebra_test` **antes** de cargar `.env` (dev queda intacto).
2. Perfil completo documentado en `apps/api/.env.test`.
3. Crea `hebra_test` si no existe, migra y trunca tablas antes del suite.

**Setup inicial de `hebra_test`:**

```powershell
.\scripts\dev-setup.ps1
# o, con MySQL ya corriendo:
docker exec hebra-mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS hebra_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON hebra_test.* TO 'hebra'@'%'; FLUSH PRIVILEGES;"
```

Si ves `Refusing to run tests against the dev database "hebra"`, no forzaste `DB_DATABASE=hebra` al correr tests — revisá que exista `apps/api/.env.test`.

## Cuándo volver a Railway

- Cerrar un sprint y validar deploy real.
- Probar CORS/cookies con web local + API en HTTPS (opcional).
- Antes de la sesión de carga de datos con el dueño en producción.

Checklist deploy: `docs/RAILWAY_DEPLOY.md`.

## Problemas frecuentes

| Síntoma                          | Solución                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `"pnpm" no se reconoce`          | Usá `npm run dev:api` / `npm run dev:web` desde la **raíz** del repo (`hebra\`, no `hebra\apps\`). O instalá pnpm: `corepack enable` y `corepack prepare pnpm@9.15.4 --activate` |
| `Access denied for user 'hebra'` | `docker compose up -d mysql` o `scripts\setup-mysql-local.sql`                                                       |
| Puerto 3306 ocupado              | Cambiar en `docker-compose.yml` a `3307:3306` y `DB_PORT=3307` en `.env`                                             |
| Login falla / CORS               | `FRONTEND_URL=http://localhost:5173` en API; `VITE_API_URL=http://localhost:3333` en web; reiniciar ambos servidores |
| Tests fallan: base `hebra_test` no existe | `.\scripts\dev-setup.ps1` o SQL de la sección **Base de datos de tests** arriba |
| Dashboard con compras `F-100` etc. en dev | Corriste tests contra `hebra` por error; usá `hebra_test`. Limpieza: `.\scripts\cleanup-test-dashboard-data.ps1` (tras merge patch Sprint 2) |

## Descubrimiento con el dueño (Sprint 2)

- Cuestionario y respuestas: **`docs/SPRINT2_DISCOVERY_DUENO.md`**
- Decisiones de modelo para código: **`docs/SPRINT2_DECISIONES_MODELO.md`**
- Feedback sesión demo (post-Sprint 2): **`docs/SPRINT2_FEEDBACK_DUENO.md`**
- Reporte de cierre: **`docs/REPORTE_CIERRE_SPRINT2.md`**

## Datos de test en BD local

Los tests funcionales de la API (`apps/api/tests/functional/`) crean datos como compras `F-100`, `F-101`, `F-VIEJA` (`dashboard.spec.ts`). Si corrés tests contra la misma base `hebra` que usás en dev, esos registros pueden aparecer en el dashboard.

**Limpieza puntual:**

```powershell
.\scripts\cleanup-test-dashboard-data.ps1
```

**Prevención (backlog #005):** usar una base `hebra_test` solo para tests. Mientras tanto, no correr `pnpm --filter api test` contra la BD de demo si vas a mostrarle datos al dueño.

**Usuario admin local:** si el login falla, re-seed:

```powershell
cd apps\api
node ace db:seed -f database/seeders/admin_user_seeder
```

Credenciales por defecto: `admin@hebra.local` / valor de `ADMIN_PASSWORD` en `.env`.

---
