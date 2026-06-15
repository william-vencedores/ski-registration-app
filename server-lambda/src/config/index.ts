function env(key: string, fallback = ''): string {
  const val = process.env[key];
  return val && val !== 'none' ? val : fallback;
}

export const config = {
  jwt: {
    secret: env('JWT_SECRET', 'dev-secret-change-in-production'),
    expirationHours: parseInt(env('JWT_EXPIRATION_HOURS', '8'), 10),
  },
  clientUrl: env('CLIENT_URL', 'http://localhost:5173'),
  dynamodb: {
    tableName: env('DYNAMODB_TABLE', 'VencedoresSkiTable'),
    region: env('AWS_REGION', 'us-east-2'),
    endpoint: env('DYNAMODB_ENDPOINT') || undefined,
  },
  admin: {
    defaultUsername: env('ADMIN_USERNAME', 'admin'),
    defaultPassword: env('ADMIN_PASSWORD', 'changeme'),
  },
  stripe: {
    secretKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
  },
  email: {
    from: env('EMAIL_FROM') || env('SMTP_USER'),
    region: env('AWS_REGION', 'us-east-2'),
    resendApiKey: env('RESEND_API_KEY'),
  },
  zelle: {
    email: env('ZELLE_EMAIL', 'info@vencedores.net'),
    recipientName: env('ZELLE_RECIPIENT_NAME', 'William Mercado'),
  },
  cors: {
    allowedOrigins: [
      env('CLIENT_URL', 'http://localhost:5173'),
      'https://www.vencedores.net',
      'https://ski.vencedores.net',
    ],
  },
} as const;
