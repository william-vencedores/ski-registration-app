// App-wide configuration sourced from Vite env vars, with sensible defaults.

export const zelleConfig = {
  email: import.meta.env.VITE_ZELLE_EMAIL ?? 'info@vencedores.net',
  recipientName: import.meta.env.VITE_ZELLE_NAME ?? 'William Mercado',
}
