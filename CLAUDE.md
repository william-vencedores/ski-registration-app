# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client + server)
npm run install:all

# Run both client and server concurrently in development
npm run dev

# Run individually
npm run dev:client   # Vite dev server → http://localhost:5173
npm run dev:server   # Express server → http://localhost:3001

# Build frontend for production
npm run build        # runs: cd client && npm run build

# Server production start
cd server && npm start
```

The server uses `node --watch` for auto-reload in dev — no nodemon needed.

## Architecture

This is a **monorepo** with a React/Vite frontend (`client/`) and an Express backend (`server/`). The root `package.json` only orchestrates the two via `concurrently`.

### Frontend (`client/`)

- **State**: Single Zustand store (`client/src/lib/store.ts`) holds `lang`, `selectedEvent`, `currentStep`, `formData`, and `confirmationId`. Everything is derived from this store — no prop drilling.
- **Registration flow**: `App.tsx` renders `RegistrationForm` only when a `selectedEvent` is set. The form orchestrates 6 step components (Step1–Step6) + a `SuccessScreen` at step index 6. Validation lives in `RegistrationForm.tsx`'s `validate()` function.
- **i18n**: `client/src/lib/i18n.ts` contains a flat `translations` object with `es` and `en` keys. `useTranslation` hook reads `lang` from the store and returns the matching subtree as `t`. All UI strings come from `t`.
- **Payments**: Step6 uses `@stripe/react-stripe-js`. The flow is: client calls `POST /api/payment/create-intent` → receives `clientSecret` → Stripe Elements handles card entry → on success, client calls `POST /api/registration/submit`.
- **Admin**: `/admin` route is protected by `ProtectedRoute` which reads a JWT from `localStorage`. Admin API calls are in `client/src/lib/adminApi.ts`.

### Backend (`server/`)

- **ESM**: `"type": "module"` — all imports use `.js` extensions.
- **Shared state**: `app.locals.registrations` is the in-memory array shared between `registration.js` and `admin.js` routes. This resets on server restart. Replace with a DB for persistence.
- **Route layout**:
  - `POST /api/payment/create-intent` — creates Stripe PaymentIntent
  - `POST /api/registration/submit` — saves record and sends confirmation email
  - `POST /api/auth/login` — returns JWT (credentials from `.env`)
  - `GET /api/admin/registrations` — JWT-protected, filterable by `?eventId=`
  - `PATCH /api/admin/registrations/:id/attendance` — toggle attendance
  - `POST /api/admin/registrations/:id/email` — resend confirmation
  - `GET /api/admin/stats` — per-event summary
  - `POST /api/webhook` — Stripe webhook (must be mounted **before** `express.json()`)
- **Auth**: JWT via `jsonwebtoken`. Admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) are stored in `server/.env`. `requireAuth` middleware sets `req.admin`.

### Adding a new event

Events are defined in **two places** that must stay in sync:
1. `client/src/lib/events.ts` — `EVENTS` array (TypeScript, used for UI display)
2. `server/src/lib/events.js` — `EVENTS` object keyed by `id` (used for pricing/validation)

### Environment variables

**`client/.env`** (copy from `client/.env.example`):
- `VITE_STRIPE_PUBLISHABLE_KEY`

**`server/.env`** (copy from `server/.env.example`):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`
- `CLIENT_URL` (defaults to `http://localhost:5173`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional, for confirmation emails)

### Local Stripe webhook forwarding

```bash
stripe listen --forward-to localhost:3001/api/webhook
```

Copy the printed signing secret into `server/.env` as `STRIPE_WEBHOOK_SECRET`.
