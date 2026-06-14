# Vencedores Ski — Registration App

Bilingual (ES/EN) ski group registration web app for Vencedores, built with **React + Vite + Tailwind CSS** on the frontend and **TypeScript + AWS Lambda** on the backend.

**Live:** https://www.vencedores.net

---

## Project Structure

```
vencedores-ski/
├── client/                   # React + Vite frontend (hosted on S3 + CloudFront)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Background, Header, Hero, Gallery
│   │   │   ├── steps/        # Step1–6 form components + SuccessScreen
│   │   │   └── ui/           # EventSelector, StepProgress
│   │   ├── hooks/            # useTranslation
│   │   ├── lib/              # i18n, store (Zustand), adminApi
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── vite.config.ts
│
└── server-lambda/            # TypeScript Lambda backend (API Gateway + SAM)
    ├── src/
    │   ├── config/           # Environment config
    │   ├── handlers/         # Route handlers
    │   ├── middleware/       # JWT auth, CORS, error handling
    │   ├── repository/       # DynamoDB single-table repository
    │   ├── services/         # Business logic
    │   ├── types/            # Request DTOs
    │   ├── index.ts          # Main Lambda entry point
    │   └── seed.ts           # Seed Lambda (admin user + disclosures)
    ├── templates/            # Handlebars email templates
    ├── template.yaml         # AWS SAM infrastructure
    └── package.json
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
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_GOOGLE_MAPS_API_KEY=...
```

**Backend** — create `server-lambda/samconfig.yaml` (see `samconfig.yaml` section in CLAUDE.md for required parameters).

### 3. Run in development

```bash
npm run dev:client   # Frontend → http://localhost:5173
```

---

## Deployment

Deployment is fully automated via **GitHub Actions** on push to `main`:

- **Frontend**: Built and synced to S3, CloudFront cache invalidated
- **Backend**: Built and deployed via AWS SAM (`sam build` + `sam deploy`)

### Manual deployment

```bash
# Frontend
cd client && npm run build
aws s3 sync dist/ s3://BUCKET_NAME --delete

# Backend
cd server-lambda
npm run build:sam
sam build
sam deploy
```

### Infrastructure

| Component | Service |
|-----------|---------|
| Frontend hosting | S3 + CloudFront |
| API | API Gateway HTTP API (v2) + Lambda |
| Database | DynamoDB (single-table design) |
| Email | AWS SES |
| Payments | Stripe |
| IaC | AWS SAM (`template.yaml`) |

---

## Stripe Setup

### Test Cards
| Card Number          | Result              |
|----------------------|---------------------|
| 4242 4242 4242 4242  | Success             |
| 4000 0000 0000 9995  | Decline             |
| 4000 0025 0000 3155  | 3D Secure prompt    |

Use any future expiry date and any 3-digit CVC.

### Webhooks

```bash
# Local development
stripe listen --forward-to localhost:3000/api/webhook
```

Production webhook endpoint: `https://www.vencedores.net/api/webhook`

---

## Tech Stack

| Layer     | Tech                                        |
|-----------|---------------------------------------------|
| Frontend  | React, Vite, TypeScript                     |
| Styling   | Tailwind CSS, Framer Motion                 |
| State     | Zustand                                     |
| Payments  | Stripe Elements + PaymentIntents API        |
| Backend   | TypeScript, AWS Lambda, Node.js 22          |
| Database  | DynamoDB (single-table)                     |
| Email     | AWS SES + Handlebars templates              |
| Infra     | AWS SAM, API Gateway, S3, CloudFront        |
| CI/CD     | GitHub Actions                              |
| i18n      | Custom ES/EN translation system             |
