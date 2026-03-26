# 🏔️ Vencedores Ski — Registration App

Bilingual (ES/EN) ski group registration web app for Vencedores, built with **React + Vite + Tailwind CSS** on the frontend and **Express + Stripe** on the backend.

---

## Project Structure

```
vencedores-ski/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── assets/           # Logo and images
│   │   ├── components/
│   │   │   ├── layout/       # Background, Header, Hero, Gallery
│   │   │   ├── steps/        # Step1–6 form components + SuccessScreen
│   │   │   └── ui/           # EventSelector, StepProgress
│   │   ├── hooks/            # useTranslation
│   │   ├── lib/              # i18n, store (Zustand), events data
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── server/                   # Express backend
    ├── src/
    │   ├── lib/              # email.js, events.js
    │   ├── routes/           # payment.js, registration.js, webhook.js
    │   └── index.js
    └── .env.example
```

---

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment variables

**Client** (`client/.env`):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY
```

**Server** (`server/.env`):
```env
PORT=3001
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET

# Optional — for confirmation emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

Get your Stripe keys from: https://dashboard.stripe.com/apikeys

### 3. Run in development

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

---

## Stripe Setup

### Test Cards
| Card Number          | Result              |
|----------------------|---------------------|
| 4242 4242 4242 4242  | ✅ Success           |
| 4000 0000 0000 9995  | ❌ Decline           |
| 4000 0025 0000 3155  | 🔐 3D Secure prompt  |

Use any future expiry date and any 3-digit CVC.

### Webhooks (optional for local dev)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhook events to your local server
stripe listen --forward-to localhost:3001/api/webhook
```

Copy the webhook signing secret from the CLI output into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

---

## Adding Events

Edit `client/src/lib/events.ts` to add future events:

```ts
{
  id: 'venc2029',
  icon: '🏔️',
  nameEs: 'Vencedores en la Nieve 2029',
  nameEn: 'Vencedores on the Snow 2029',
  metaEs: 'Febrero 2029 · Park City, UT',
  metaEn: 'February 2029 · Park City, UT',
  price: 160,
  processing: 4.65,
}
```

Also mirror the entry in `server/src/lib/events.js`.

---

## Adding a Real Database

The server currently uses an in-memory array. Replace it in `server/src/routes/registration.js`:

**Supabase example:**
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// Replace: registrations.push(registrationRecord)
const { error } = await supabase.from('registrations').insert(registrationRecord)
```

---

## Adding Gallery Photos

Replace the Unsplash placeholders in `client/src/components/layout/Gallery.tsx`:

```tsx
const photos = [
  { src: '/photos/vencedores-2026-1.jpg', alt: 'Group skiing', span: true },
  { src: '/photos/vencedores-2026-2.jpg', alt: 'Summit' },
  // ...
]
```

Place photos in `client/public/photos/`.

---

## Production Deployment

**Frontend** — Deploy to Vercel / Netlify:
```bash
cd client && npm run build
# Upload dist/ folder
```

**Backend** — Deploy to Railway / Render / Fly.io:
```bash
cd server && npm start
```

Update `vite.config.ts` proxy target for production:
```ts
proxy: {
  '/api': { target: 'https://your-api.railway.app' }
}
```

---

## Tech Stack

| Layer     | Tech                                        |
|-----------|---------------------------------------------|
| Frontend  | React 18, Vite, TypeScript                  |
| Styling   | Tailwind CSS v3, Framer Motion              |
| State     | Zustand                                     |
| Payments  | Stripe Elements + PaymentIntents API        |
| Backend   | Express 4, Node.js                          |
| Email     | Nodemailer (Gmail / any SMTP)               |
| i18n      | Custom ES/EN translation system             |
