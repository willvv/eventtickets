# Entradas CR — Event Ticketing & Management Platform

A production-ready, full-stack event ticketing and management web application built with Next.js, MongoDB, and modern TypeScript tooling.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Server Components)
- **Database**: MongoDB 7 + Mongoose (replica set required for transactions)
- **Auth**: NextAuth.js v4 — Google OAuth + Magic Link (Email)
- **API**: tRPC v11 + TanStack Query v5
- **Validation**: Zod
- **Styling**: Tailwind CSS v4 + Radix UI primitives
- **Testing**: Vitest + React Testing Library + Playwright (E2E)
- **i18n**: next-intl (Costa Rican Spanish `es-CR`, architected for English later)
- **QR Codes**: HMAC-SHA256 signed payloads (tamper-proof)
- **Canvas Editor**: Custom drag-and-drop layout editor (CSS-based, extensible to Konva)

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 7 (standalone for dev, replica set for prod — see MongoDB note below)
- Google Cloud OAuth credentials

### Installation

```bash
git clone https://github.com/willvv/eventtickets
cd eventtickets
npm install --legacy-peer-deps
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:
| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:4000` |
| `NEXTAUTH_SECRET` | Random 32+ char secret |
| `MONGODB_URI` | MongoDB connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `QR_SIGNING_SECRET` | 32+ char secret for QR HMAC |
| `CLAIM_TOKEN_SECRET` | 32+ char secret for claim tokens |
| `SUPERADMIN_EMAIL` | Email seeded as platform superadmin |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services → OAuth consent screen**
   - User type: External
   - Required scopes: `openid`, `userinfo.email`, `userinfo.profile`
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - **Authorized JavaScript origins**: `http://localhost:4000` (add production URL too)
   - **Authorized redirect URIs**: `http://localhost:4000/api/auth/callback/google`
5. Copy **Client ID** → `GOOGLE_CLIENT_ID`
6. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### Running Locally

```bash
# Start dev server (port 4000)
npm run dev

# Seed database with sample data
npm run db:seed
```

The app will be available at **http://localhost:4000**

After seeding, use these accounts (sign in via magic link or Google):
- **Superadmin**: value of `SUPERADMIN_EMAIL` env var
- **Org Admin**: `admin@discotecademo.cr`
- **Staff**: `staff@discotecademo.cr`
- **Customers**: `maria@example.com`, `carlos@example.com`

## MongoDB Replica Set Note

MongoDB **transactions** (used for atomic seat reservation and ticket issuance) require a replica set. For production, use:
- MongoDB Atlas (replica set by default)
- Self-hosted 3-node replica set (configured in `docker-compose.yml`)

For local development **without** Docker, either:
1. Use a free MongoDB Atlas cluster
2. Or run a single-node replica set:

```bash
mongod --replSet rs0 --dbpath /data/db &
mongosh --eval "rs.initiate()"
```

## Docker (Local Dev with Replica Set)

```bash
docker-compose up -d
```

This starts a 3-node MongoDB replica set + the Next.js app on port 4000.

## Architecture

```
eventtickets/
├── app/               # Next.js App Router pages + API routes
├── components/        # React components
│   ├── ui/            # Headless UI primitives (Radix-based)
│   ├── canvas/        # Drag-and-drop layout editor
│   ├── scanner/       # QR scanner (camera + jsQR)
│   ├── tickets/       # Ticket display components
│   └── shared/        # Reusable dialogs, spinners
├── lib/               # Framework-agnostic business logic
│   ├── auth/          # NextAuth config + helpers + RBAC permissions
│   ├── db/            # MongoDB connection + transaction helper
│   ├── tickets/       # State machine, QR signing, claim tokens
│   ├── trpc/          # tRPC server, routers, client
│   └── utils/         # cn(), slugify, date formatting, currency
├── messages/          # i18n locale files (es-CR.json)
├── models/            # Mongoose schemas (User, Org, Event, Ticket, Order, ...)
├── types/             # TypeScript type definitions + next-auth augmentations
├── tests/             # Unit tests (Vitest) + E2E (Playwright)
├── scripts/           # Database seed script
└── i18n/              # next-intl routing + request config
```

### Roles

| Role | Access |
|---|---|
| `superadmin` | Platform-wide: manages orgs, users, global settings |
| `org_admin` | Full org dashboard: events, members, settings |
| `org_staff` | Selling, scanning, viewing events |
| `customer` | Public portal: browse events, reserve tickets |

### Ticket State Machine

```
available → reserved → issued → claimed → scanned
                  ↓         ↓
              cancelled  cancelled
```

- **reserved**: Held for configurable TTL (default 6h)
- **issued**: Paid + QR generated + claim link sent
- **claimed**: Download link used (single-use)
- **scanned**: Checked in at door

### Security

- All inputs validated server-side with **Zod**
- NextAuth **JWT** sessions with httpOnly secure cookies
- **HMAC-SHA256** signed QR codes (constant-time comparison)
- Single-use **claim tokens** (hashed in DB, atomic mark-used)
- **Tenant isolation** enforced at service layer (every query scoped by `orgId`)
- **Audit log** for sensitive actions (issue, cancel, scan, impersonate)
- Rate limiting on auth and public endpoints
- CSRF protection via NextAuth + SameSite cookies

## Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires running dev server)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## Deployment

### Cloudflare Pages

The project is configured for Cloudflare Pages deployment (connected to `main` branch).

For environment variables in Cloudflare Pages:
- Go to your Pages project → **Settings → Environment variables**
- Add all variables from `.env.example`
- Set `NODE_ENV=production`

**Note**: Cloudflare Pages uses Edge Runtime. For full Node.js compatibility (required for `crypto`, `mongoose`), configure the project to use **Node.js compatibility** mode in Cloudflare Pages settings, or deploy via Cloudflare Workers with `nodejs_compat` flag.

### MongoDB Atlas (Recommended for Production)

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Add your Cloudflare IP to the allowlist (or use 0.0.0.0/0 for development)
3. Create a database user
4. Copy the connection string to `MONGODB_URI`

## Schema / Collections

| Collection | Description |
|---|---|
| `users` | All platform users (superadmin, org members, customers) |
| `organizations` | Tenant orgs with payment methods and settings |
| `orgmembers` | User ↔ org membership with role (org_admin/org_staff) |
| `events` | Events with layout JSON, section prices, status |
| `orders` | Purchase orders grouping multiple tickets |
| `tickets` | Individual tickets with state machine + QR HMAC |
| `claimtokens` | Single-use claim links (hashed, TTL-indexed) |
| `auditlogs` | Immutable audit trail for sensitive actions |

## Roadmap (Out of Scope for v1)

The following are explicitly out of scope for v1 but the architecture is designed to accommodate them:

- **Real credit card processing** (Stripe integration hooks exist; payment abstraction ready)
- **Automated SINPE Móvil API** (current flow uses manual proof upload + WhatsApp)
- **Native mobile apps** (web is fully mobile-responsive as a PWA)
- **WhatsApp Business API** (current flow uses `wa.me` direct links)
- **Apple Wallet .pkpass generation** (env vars and stubs in place)
- **Google Wallet JWT passes** (env vars documented)
- **PDF ticket generation** (@react-pdf/renderer planned)
- **English localization** (next-intl routing ready for `en` locale addition)

## License

Private — All rights reserved.
