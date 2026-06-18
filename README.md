# Hebra

Sistema de gestión para taller textil (clientes, pedidos, inventario, compras, máquinas).

Documentación del proyecto en [`docs/`](./docs/). Reglas para el agente en [`.cursorrules`](./.cursorrules).

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Docker (opcional, para MySQL local desde Sprint 1 PR #6)

## Inicio rápido (local)

```powershell
# Instalar dependencias (desde la raíz)
# Si `pnpm` no está en PATH: npx pnpm@9.15.4 install
pnpm install

# Lint y formato (todo el monorepo)
pnpm lint
pnpm format:check

# Desarrollo (API disponible desde PR #2)
pnpm --filter api dev

# Web (PR #4)
pnpm --filter web dev
```

## Estructura

```
hebra/
├── apps/
│   ├── api/     # AdonisJS 6 + MySQL
│   └── web/     # React 18 + Vite
├── docs/        # Especificación y alcance por sprint
└── package.json # Workspaces pnpm
```

## Variables de entorno

Copiá los ejemplos y completá valores locales:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
# Editar apps\api\.env — APP_KEY, MySQL, ADMIN_*
```

Ver [`docs/MES_01_APP_GESTION.md`](./docs/MES_01_APP_GESTION.md) Apéndice B.

### API — MySQL local

El error `Access denied for user 'hebra'@'localhost'` significa que MySQL corre, pero **no existe** el usuario/base del `.env`. Elegí una opción:

**Opción A — Docker (recomendado)**

```powershell
# Si ya tenés MySQL en 3306, detenelo primero o usá puerto 3307 (ver docker-compose.yml)
docker compose up -d mysql
# Esperar ~15 s a que el healthcheck esté healthy
```

**Opción B — MySQL ya instalado (XAMPP, WAMP, MySQL Server)**

```powershell
# Ajustá -u root y la contraseña según tu instalación
mysql -u root -p < scripts\setup-mysql-local.sql
```

Luego:

```powershell
cd apps\api
node ace migration:run
node ace db:seed
node ace serve --hmr
```

Health check: `GET http://localhost:3333/health`

### Deploy en Railway

Ver [`docs/RAILWAY_DEPLOY.md`](./docs/RAILWAY_DEPLOY.md) — por ahora solo **API + MySQL** en Railway; el **web corre en local** hasta definir la estrategia de distribución (PWA / nativo).

## Sprint actual

**Sprint 1** — Monorepo, auth y dashboard vacío. Detalle en [`docs/MES_01_APP_GESTION.md`](./docs/MES_01_APP_GESTION.md).
