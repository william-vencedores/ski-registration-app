# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client)
npm run install:all

# Run client dev server
npm run dev:client   # Vite dev server → http://localhost:5173

# Build frontend for production
npm run build        # runs: cd client && npm run build

# Build Lambda for SAM deployment
cd server-lambda && npm run build:sam

# SAM build & deploy (requires AWS_PROFILE=vencedores)
cd server-lambda && sam build && sam deploy
```

## Architecture

This is a **monorepo** with a React/Vite frontend (`client/`) and a TypeScript Lambda backend (`server-lambda/`).

### Frontend (`client/`)

- **Hosting**: S3 + CloudFront (`www.vencedores.net`)
- **State**: Single Zustand store (`client/src/lib/store.ts`) holds `lang`, `selectedEvent`, `currentStep`, `formData`, and `confirmationId`. Everything is derived from this store — no prop drilling.
- **Registration flow**: `App.tsx` renders `RegistrationForm` only when a `selectedEvent` is set. The form orchestrates 6 step components (Step1–Step6) + a `SuccessScreen` at step index 6. Validation lives in `RegistrationForm.tsx`'s `validate()` function.
- **i18n**: `client/src/lib/i18n.ts` contains a flat `translations` object with `es` and `en` keys. `useTranslation` hook reads `lang` from the store and returns the matching subtree as `t`. All UI strings come from `t`.
- **Payments**: Step6 uses `@stripe/react-stripe-js`. The flow is: client calls `POST /api/payment/create-intent` → receives `clientSecret` → Stripe Elements handles card entry → on success, client calls `POST /api/registration/submit`.
- **Admin**: `/admin` route is protected by `ProtectedRoute` which reads a JWT from `localStorage`. Admin API calls are in `client/src/lib/adminApi.ts`.

### Backend (`server-lambda/`)

- **Stack**: TypeScript, Node.js 22, AWS Lambda behind API Gateway (HTTP API v2)
- **Infrastructure**: AWS SAM (`server-lambda/template.yaml`)
- **Database**: DynamoDB single-table design (`VencedoresSkiTable`) with GSI1 for registration lookups by ID
- **Email**: AWS SES with Handlebars templates (`server-lambda/templates/`)
- **Layout**:
  - `src/config/` — Central config from environment variables
  - `src/middleware/` — JWT auth, CORS, error handling
  - `src/handlers/` — Route handlers (thin wrappers calling services)
  - `src/services/` — Business logic
  - `src/repository/` — DynamoDB single-table repository using DocumentClient
  - `src/types/` — Request DTOs
  - `src/index.ts` — Main Lambda entry point with path-based router
  - `src/seed.ts` — Standalone Lambda for seeding admin user and disclosures
- **Route layout**:
  - `POST /api/payment/create-intent` — creates Stripe PaymentIntent
  - `POST /api/registration/submit` — saves registration to DynamoDB and sends confirmation email
  - `POST /api/auth/login` — returns JWT (admin users stored in DynamoDB with bcrypt)
  - `GET /api/auth/me` — returns current admin info
  - `GET /api/admin/registrations` — JWT-protected, filterable by `?eventId=`
  - `GET /api/admin/registrations/:id` — single registration detail
  - `PATCH /api/admin/registrations/:id/attendance` — toggle attendance
  - `POST /api/admin/registrations/:id/email` — resend confirmation
  - `GET /api/admin/stats` — per-event summary
  - `POST /api/webhook` — Stripe webhook
  - `POST /api/returning/send-code` — send 6-digit verification code to email
  - `POST /api/returning/verify-code` — verify code, return profile data for returning users
  - `GET /api/events` — public, list active events
  - `GET /api/events/:id` — public, single event
  - `GET /api/events/:id/disclosures` — public, event disclosures for registration form
  - `POST/PUT/DELETE /api/admin/events` — CRUD events
  - `POST/PUT/DELETE /api/admin/disclosures` — CRUD disclosures (versioned)
  - `POST/DELETE /api/admin/events/:id/disclosures` — attach/detach disclosures to events
  - `GET/POST/PUT/DELETE /api/admin/users` — admin user management
- **Auth**: JWT via `jsonwebtoken`. Admin users stored in DynamoDB with bcrypt-hashed passwords. Default admin seeded via the Seed Lambda from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars.

### Disclosures

Disclosures (legal waivers, consent forms) are versioned documents that can be attached to multiple events. Each disclosure has ES/EN translations. During registration, participants accept each disclosure individually. Acceptances track the specific version signed.

### Environment variables

**`client/.env`** (copy from `client/.env.example`):
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`

**`server-lambda/`** (set via SAM parameters in `samconfig.yaml`):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — used to seed default admin
- `JWT_SECRET`
- `CLIENT_URL` (defaults to `https://www.vencedores.net`)
- `EMAIL_FROM` — SES verified sender address
- `DYNAMODB_TABLE` (defaults to `VencedoresSkiTable`)
- `AWS_REGION` (defaults to `us-east-2`)

### Deployment

- **Frontend**: S3 bucket (`vencedores-ski-frontend-469935552760`) behind CloudFront (`E2H2R3GSMVRS02`)
- **Backend**: AWS Lambda via SAM, behind API Gateway HTTP API
- **CloudFront** has two origins: S3 for static files (`/*`), API Gateway for API (`/api/*`)
- **GitHub Actions** deploys both in parallel on push to `main` — frontend via `aws s3 sync` + CloudFront invalidation, backend via `sam build` + `sam deploy`
- **SAM config** (`samconfig.yaml`) is gitignored as it contains secrets. CI uses GitHub Secrets instead.

### Local Stripe webhook forwarding

```bash
stripe listen --forward-to localhost:3000/api/webhook
```
