# MyFurniture Backend API (Neon Serverless PostgreSQL)

A high-performance, production-ready REST API for the **MyFurniture** online solid-wood handcrafted furniture store, architecturally inspired by Woodsala's multi-layered catalog and shopping experience. Powered by **Neon Serverless PostgreSQL**.

---

## Neon Serverless Database Configuration

Neon separates compute and storage, providing autoscaling, instant branching, and connection pooling via PgBouncer.

### 1. Connection Strings: Pooled vs. Direct Unpooled

In your Neon Console dashboard under **Dashboard -> Connection Details**:

1. **`DATABASE_URL` (Pooled Connection)**:
   - Check the **"Connection pooling"** checkbox.
   - Endpoint host contains `-pooler`: `ep-xxxx-pooler.region.aws.neon.tech`.
   - Used for the primary Express application at runtime. PgBouncer keeps connections lightweight and scalable.
2. **`DATABASE_URL_UNPOOLED` (Direct Connection)**:
   - Uncheck the **"Connection pooling"** checkbox.
   - Endpoint host does NOT contain `-pooler`: `ep-xxxx.region.aws.neon.tech`.
   - Used for DDL migrations (`npm run migrate`) and seeding (`npm run seed`). Transaction-level PgBouncer does not support advisory locks and prepared transaction statements required by schema migrations.
3. **SSL Mode Requirement**:
   - Neon requires SSL. Both connection strings must end with: `?sslmode=require`.

### 2. Auto-Suspension & Cold-Start Wakeup

When your Neon project compute is idle, it enters a suspended state to conserve resources.
The application includes automatic retry logic with exponential backoff (3 attempts: 1.5s, 3s, 6s) during startup and query execution to seamlessly wake up suspended compute instances without dropping requests or crashing the server.

---

## Server Startup Sequence

When the server starts (`src/server.ts`), it executes this exact 5-step lifecycle:

1. **Step a: Load & Validate Environment** — Validates `DATABASE_URL` and all runtime variables with Zod schemas (`src/config/env.ts`). Ensures credentials are never printed in plain text.
2. **Step b: Connect & Health Check** — Executes a `SELECT 1` ping against Neon with auto-retry backoff to wake up suspended compute.
3. **Step c: Run Migrations** — Automatically runs pending versioned migrations in `development` mode or whenever `RUN_MIGRATIONS_ON_START=true`. In production, migrations can be run separately via `npm run migrate`.
4. **Step d: Seed Database** — In `development` mode, checks if tables are empty and idempotently seeds initial categories, products, variants, and admin accounts.
5. **Step e: Start Express Server** — Launches HTTP server, mounts OpenAPI documentation at `/api/docs`, and exposes `/health`.

---

## Environment Variables Reference

Configure these in your `backend/.env` file:

| Variable | Description | Example / Default |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP server listening port | `5000` |
| `API_PREFIX` | REST API version prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed CORS frontend origin | `http://localhost:5173` |
| `DATABASE_URL` | Neon pooled connection string (**required**, must include `?sslmode=require`) | `postgresql://user:pass@ep-pooler...neon.tech/myfurniture_db?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string for migrations/seeds (**optional**) | `postgresql://user:pass@ep-direct...neon.tech/myfurniture_db?sslmode=require` |
| `TEST_DATABASE_URL` | Neon isolated branch connection string for tests (**optional**) | `postgresql://user:pass@ep-test...neon.tech/myfurniture_test?sslmode=require` |
| `RUN_MIGRATIONS_ON_START` | Whether to run migrations on startup in production | `false` (default) / `true` |
| `JWT_ACCESS_SECRET` | 32+ character secret for JWT access tokens | (Required secret) |
| `JWT_REFRESH_SECRET` | 32+ character secret for JWT refresh tokens | (Required secret) |
| `JWT_ACCESS_EXPIRES_IN` | JWT access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| JWT refresh token lifetime | `7d` |
| `LOG_LEVEL` | Winston logging level (`info`, `debug`, `warn`, `error`) | `info` |

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.0.0
- An active project on [neon.tech](https://neon.tech)

### 2. Environment Setup
Create `backend/.env` (or copy `.env.example`):
```bash
cp .env.example .env
```
Paste your Neon database connection strings into `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migrations & Seed (Manual commands)
```bash
# Run migrations using direct unpooled connection
npm run migrate

# Seed sample handcrafted furniture catalog
npm run seed
```

### 5. Start the Server
```bash
# Development mode with hot-reloading (runs pending migrations & seeds automatically if empty)
npm run dev

# Or build and run production bundle
npm run build
npm start
```

---

## API Documentation & Endpoints

Interactive Swagger/OpenAPI documentation is available at:
👉 **`http://localhost:5000/api/docs`**

### Summary of REST Endpoints (`/api/v1`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | System health & Neon database connectivity (`SELECT 1`) | Public |
| `POST` | `/api/v1/auth/register` | Register customer account | Public |
| `POST` | `/api/v1/auth/login` | Login & receive JWT access + refresh token | Public |
| `POST` | `/api/v1/auth/refresh` | Refresh expired access token | Public |
| `POST` | `/api/v1/auth/logout` | Invalidate current session | Public |
| `GET` | `/api/v1/auth/me` | Get current logged-in user profile | Customer / Admin |
| `GET` | `/api/v1/categories` | Get hierarchical category tree | Public |
| `GET` | `/api/v1/categories/:slug` | Get category details by slug | Public |
| `GET` | `/api/v1/products` | Filtered, sorted, paginated product list | Public |
| `GET` | `/api/v1/products/:slug` | Full product detail with variants & gallery | Public |
| `GET` | `/api/v1/products/:slug/related`| Related products in same category | Public |
| `GET` | `/api/v1/cart` | Get cart items with subtotal & pricing | Public / Customer |
| `POST` | `/api/v1/cart/items` | Add product variant to cart | Public / Customer |
| `PATCH` | `/api/v1/cart/items/:id` | Update item quantity in cart | Public / Customer |
| `DELETE` | `/api/v1/cart/items/:id` | Remove item from cart | Public / Customer |
| `DELETE` | `/api/v1/cart` | Clear entire cart | Public / Customer |
| `POST` | `/api/v1/orders` | Place order from cart (atomic transaction) | Customer |
| `GET` | `/api/v1/orders/my-orders` | Paginated customer past orders | Customer |
| `GET` | `/api/v1/orders/:id` | Order details & status tracking | Customer / Admin |
| `GET` | `/api/v1/addresses` | List customer delivery addresses | Customer |
| `POST` | `/api/v1/addresses` | Add new delivery address | Customer |
| `PUT` | `/api/v1/addresses/:id` | Update delivery address | Customer |
| `DELETE` | `/api/v1/addresses/:id` | Delete delivery address | Customer |
| `PATCH` | `/api/v1/addresses/:id/default`| Set default delivery address | Customer |
| `GET` | `/api/v1/products/:id/reviews` | List approved customer reviews | Public |
| `POST` | `/api/v1/products/:id/reviews` | Submit product review | Customer |
| `GET` | `/api/v1/admin/stats` | Business KPI metrics & low stock alerts | Admin |
| `POST` | `/api/v1/admin/products` | Create product, images, and variants | Admin |
| `PUT` | `/api/v1/admin/products/:id` | Update product details | Admin |
| `DELETE` | `/api/v1/admin/products/:id` | Soft delete product | Admin |
| `GET` | `/api/v1/admin/orders` | List all customer orders | Admin |
| `PATCH` | `/api/v1/admin/orders/:id/status`| Update order status / payment status | Admin |

---

## Running with Docker

The containerized backend connects directly to your Neon serverless database:
```bash
docker-compose up --build -d
```

---

## Testing

Run unit and integration test suites:
```bash
npm test
npm run test:coverage
```
> **Isolated Test Branches**: To test against a live Neon database, create a dedicated branch in your Neon dashboard (e.g., `test-branch`) and set `TEST_DATABASE_URL` in your `.env`. The test suite will never execute against your primary `DATABASE_URL`.
