# Restaurant OS — Multi-Tenant SaaS (QR Ordering · Kitchen · Billing · Analytics)

A production-oriented starter for a single-domain, multi-tenant restaurant platform.

**Stack:** Node.js (Express) · MongoDB (Mongoose) · Socket.IO (real-time) · Cloudinary (images) · Angular 17 (standalone components, Signals, lazy routes, Bootstrap 5)

---

## What's implemented

| Module | Status |
|---|---|
| Multi-tenant isolation (tenant from JWT only, never from request) | ✅ |
| Auth: JWT access + rotating refresh tokens (httpOnly cookie), bcrypt | ✅ |
| RBAC: SUPER_ADMIN / OWNER / MANAGER / WAITER / KITCHEN | ✅ |
| Super Admin: create/suspend/activate restaurants, plans, **table quota** | ✅ |
| Table quota enforcement (owners cannot exceed purchased tables) | ✅ |
| QR per table → customer menu, no login, table session | ✅ |
| Order types: Dining, Takeaway, Delivery = "coming soon" (blocked server-side) | ✅ |
| Add-more-items-later (same table session), live bill via Socket.IO | ✅ |
| Item locking: SERVED items immutable, with served-at timestamp | ✅ |
| Kitchen Display: Pending → Accepted → Preparing → Ready → Served → Completed, real-time | ✅ |
| Cash flow: Mark As Paid records collector, amount, time, method (audit trail) | ✅ |
| Payments: CASH / UPI / CARD recorded (gateway integration is a stub) | ✅ |
| Menu: categories, subcategories, variants, add-ons, veg/non-veg/Jain, spicy, prep time, availability, Cloudinary images | ✅ |
| Inventory: stock, suppliers, purchases, wastage, low-stock, **auto-consumption from recipes on order accept** | ✅ |
| Analytics: sales (day/week/month/year), trends, top/worst items, peak hours/days, staff cash collected, inventory alerts | ✅ |
| Security: helmet, CORS allowlist, rate limiting (global + auth + public orders), NoSQL-injection sanitizer, Joi validation, server-side pricing, audit/login/IP logs, soft delete, secure image uploads | ✅ |
| Docker: Mongo + API compose, API Dockerfile | ✅ |

Stubs to extend for full production: online payment gateway (Razorpay/Stripe), report PDF/Excel export, email/SMS, delivery module, super-admin subscription billing.

---

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill Cloudinary keys + JWT secrets
npm install
npm run seed                  # creates super admin + demo restaurant + QR tables
npm run dev                   # http://localhost:4000

# 2. Frontend
cd ../frontend
npm install
npm start                     # http://localhost:4200
```

Or run Mongo + API with Docker:

```bash
docker compose up --build
```

### Seeded logins

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@platform.com | SuperAdmin@123 |
| Owner | owner@spicegarden.com | Owner@1234 |
| Manager | manager@spicegarden.com | Manager@1234 |
| Waiter | waiter@spicegarden.com | Waiter@1234 |
| Kitchen | kitchen@spicegarden.com | Kitchen@1234 |

The seed prints a customer URL like `http://localhost:4200/m/<qrToken>` — open it on your phone/browser to simulate scanning Table 1's QR.

> Change every seeded password before any real deployment.

---

## Architecture

### Multi-tenancy (single domain, shared database, row-level isolation)

Every tenant document carries `restaurantId`. The rules that make isolation safe:

1. `restaurantId` is **only ever read from the verified JWT** (`middleware/tenant.js`). It is never accepted from the body, query, or headers.
2. Every tenant query is built through `tenantFilter(req)`, which injects `restaurantId` + soft-delete filter.
3. Suspended/deleted restaurants are blocked at the middleware before any controller runs.
4. Customer requests carry no JWT — their tenant is derived from the QR token / session token, which maps to exactly one table in one restaurant.
5. Cloudinary assets live in tenant-scoped folders: `ros/<restaurantId>/menu`.

### Request flow

```
Customer phone ──scan QR──► GET /api/public/qr/:token ──► menu + sessionToken
       │ place order                                        │
       ▼                                                    ▼
POST /api/public/orders ──► server prices items ──► Order saved
       │                                                │
       │            Socket.IO room staff:<restaurantId> │ order:new
       ▼                                                ▼
 session:<token> ◄── bill:updated            Kitchen Display (Angular)
                                              status flow → order:updated
Waiter: POST /api/payments/mark-paid → Payment{collectedBy, amount, time, method}
```

### Real-time rooms (Socket.IO ≈ SignalR)

- `staff:<restaurantId>` — kitchen display, waiter & manager dashboards (JWT-gated join)
- `session:<sessionToken>` — one customer table session (live bill / tracking)

Events: `order:new`, `order:updated`, `item:updated`, `bill:updated`, `payment:recorded`.

### Backend layout

```
backend/src
├── config/        env, Mongo connection, Cloudinary
├── models/        Restaurant, User, Table, TableSession, Category, MenuItem,
│                  Order, Payment, InventoryItem, StockMovement, AuditLog,
│                  RefreshToken, Counter (atomic per-tenant order numbers)
├── middleware/    auth (JWT), rbac (permit), tenant (isolation), validate (Joi),
│                  rateLimit, upload (multer→Cloudinary), error
├── controllers/   auth, admin (super admin), table, menu, public (customer),
│                  order (kitchen/billing), analytics, staff, inventory
├── services/      billing (pricing + live bill), inventory (auto-consume),
│                  qr (QR URL + PNG)
├── sockets/       Socket.IO gateway + room auth
└── routes/        auth, admin, public, tenant
```

### Frontend layout (Angular 17, standalone, lazy)

```
frontend/src/app
├── core/
│   ├── services/      api, auth (signals), socket
│   ├── interceptors/  attaches Bearer token
│   └── guards/        authGuard, roleGuard(roles)
└── features/
    ├── customer/      /m/:qrToken — menu, cart, order type chooser,
    │                  live bill with LOCKED/SERVED badges, skeleton loaders
    ├── kitchen/       real-time kitchen display, status advance buttons
    ├── dashboard/     owner/manager/waiter — live orders, mark-paid, sales KPIs
    ├── superadmin/    platform stats, create/suspend restaurants,
    │                  plan + table-limit controls
    └── auth/          login
```

### Key API endpoints

```
POST /api/auth/login | /refresh | /logout
GET  /api/public/qr/:qrToken            customer scan (no auth)
POST /api/public/orders                 place / add to session
GET  /api/public/bill/:sessionToken     live bill
GET/POST /api/tables, GET /api/tables/:id/qr (PNG)
GET/POST/PATCH/DELETE /api/menu/categories | /menu/items (multipart image)
GET  /api/orders, /api/orders/kitchen-queue
PATCH /api/orders/:id/status, /api/orders/:id/items/:itemId/status
POST /api/payments/mark-paid
GET  /api/analytics/sales|items|time|staff|inventory
GET/POST /api/staff, /api/inventory, POST /api/inventory/:id/move
GET/POST/PATCH/DELETE /api/admin/restaurants (+ /status /plan /table-limit), GET /api/admin/stats
```

### Database notes (MongoDB)

- Compound indexes on every hot path: `{restaurantId, status, createdAt}`, `{restaurantId, orderNumber}` (unique), `{email, restaurantId}` (unique), TTL on refresh tokens.
- Order items snapshot name/price at order time so menu edits never corrupt history.
- Soft delete (`isDeleted`) everywhere; audit log collection records who/what/when/IP.
- `Counter` collection provides atomic per-restaurant order numbers via `findOneAndUpdate $inc`.

### Deployment sketch

- API behind a reverse proxy (nginx/ALB) with sticky sessions or the Socket.IO Redis adapter when scaling beyond one node.
- MongoDB Atlas (replica set) recommended; enable backups.
- Angular built (`ng build`) and served from a CDN/static host on `app.domain.com`; API on `api.domain.com` (or `/api` path on the same domain).
- Set strong `JWT_*` secrets, `CORS_ORIGINS`, and `secure` cookies (already enabled when `NODE_ENV=production`).
