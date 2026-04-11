# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client)
npm run install:all

# Run both client and server concurrently in development
npm run dev

# Run individually
npm run dev:client   # Vite dev server → http://localhost:5173
npm run dev:server   # Spring Boot server → http://localhost:3001

# Build frontend for production
npm run build        # runs: cd client && npm run build

# Build Java backend
npm run build:server # runs: cd server-java && mvn clean package -DskipTests

# Server production start
cd server-java && java -jar target/vencedores-ski-0.1.0.jar
```

## Architecture

This is a **monorepo** with a React/Vite frontend (`client/`) and a Spring Boot/Java backend (`server-java/`). The root `package.json` orchestrates the two via `concurrently`.

### Frontend (`client/`)

- **State**: Single Zustand store (`client/src/lib/store.ts`) holds `lang`, `selectedEvent`, `currentStep`, `formData`, and `confirmationId`. Everything is derived from this store — no prop drilling.
- **Registration flow**: `App.tsx` renders `RegistrationForm` only when a `selectedEvent` is set. The form orchestrates 6 step components (Step1–Step6) + a `SuccessScreen` at step index 6. Validation lives in `RegistrationForm.tsx`'s `validate()` function.
- **i18n**: `client/src/lib/i18n.ts` contains a flat `translations` object with `es` and `en` keys. `useTranslation` hook reads `lang` from the store and returns the matching subtree as `t`. All UI strings come from `t`.
- **Payments**: Step6 uses `@stripe/react-stripe-js`. The flow is: client calls `POST /api/payment/create-intent` → receives `clientSecret` → Stripe Elements handles card entry → on success, client calls `POST /api/registration/submit`.
- **Admin**: `/admin` route is protected by `ProtectedRoute` which reads a JWT from `localStorage`. Admin API calls are in `client/src/lib/adminApi.ts`.

### Backend (`server-java/`)

- **Stack**: Spring Boot 3, Java 21 (Corretto), Maven
- **Database**: DynamoDB single-table design (`VencedoresSkiTable`) with GSI1 for registration lookups by ID
- **Package layout**:
  - `config/` — DynamoDB, Stripe, Security, CORS, Async, DataSeeder
  - `security/` — JWT token provider + authentication filter
  - `controller/` — REST endpoints + SPA forwarding
  - `service/` — Business logic
  - `repository/` — DynamoDB single-table repository
  - `dto/request/` — Request DTOs
  - `exception/` — Global error handling
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
- **Auth**: JWT via jjwt. Admin users stored in DynamoDB with bcrypt-hashed passwords. Default admin seeded on startup from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars.

### Adding a new event

Events are now managed via the admin API (`POST /api/admin/events`). The client-side `client/src/lib/events.ts` still has hardcoded events for now — a future update will fetch events from `/api/events`.

### Disclosures

Disclosures (legal waivers, consent forms) are versioned documents that can be attached to multiple events. Each disclosure has ES/EN translations. During registration, participants accept each disclosure individually. Acceptances track the specific version signed.

### Environment variables

**`client/.env`** (copy from `client/.env.example`):
- `VITE_STRIPE_PUBLISHABLE_KEY`

**`server-java/` environment variables** (set in EB Console or local `.env`):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — used to seed default admin on first startup
- `JWT_SECRET`
- `CLIENT_URL` (defaults to `http://localhost:5173`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional, for confirmation emails)
- `DYNAMODB_TABLE` (defaults to `VencedoresSkiTable`)
- `AWS_REGION` (defaults to `us-east-2`)
- `DYNAMODB_ENDPOINT` (optional, for local DynamoDB in dev)

### Deployment

- **Frontend + Backend** are bundled together: client build is copied into `server-java/src/main/resources/public/` and served as static files by Spring Boot
- **GitHub Actions** builds both, packages a JAR + Procfile, and deploys to AWS Elastic Beanstalk (Corretto 21)
- **DynamoDB** table must exist in the same AWS region as the EB environment
- **CloudFront** sits in front of EB for HTTPS and caching

### Local Stripe webhook forwarding

```bash
stripe listen --forward-to localhost:3001/api/webhook
```
