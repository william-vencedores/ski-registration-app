import nodemailer from 'nodemailer'

function getTransporter() {
  if (!process.env.SMTP_USER) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendConfirmationEmail({ to, name, eventName, confirmationId, total }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[Email] SMTP not configured — skipping confirmation email')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /><title>Confirmación de Registro</title></head>
    <body style="margin:0;padding:0;background:#0a1628;font-family:'DM Sans',Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
        <div style="background:linear-gradient(135deg,#1e5b8a,#0d2340);border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
          <h1 style="color:#e8b84b;font-family:Georgia,serif;font-size:28px;margin:0 0 8px;letter-spacing:4px;">VENCEDORES</h1>
          <p style="color:#7ab8d9;margin:0;font-size:13px;letter-spacing:2px;">EN LA NIEVE</p>
        </div>
        <div style="background:white;border-radius:16px;padding:32px;margin-bottom:20px;">
          <h2 style="color:#1e293b;margin:0 0 4px;font-size:22px;">¡Registro Confirmado! ✓</h2>
          <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Bienvenido/a, ${name}</p>
          <div style="background:#f8fbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
            ${[
              ['Evento', eventName],
              ['Confirmación', `#${confirmationId}`],
              ['Monto Pagado', `$${total.toFixed(2)} USD`],
              ['Fecha', new Date().toLocaleDateString('es-US')],
            ].map(([l, v]) => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${l}</span>
                <span style="color:#1e293b;font-weight:600;font-size:13px;">${v}</span>
              </div>
            `).join('')}
          </div>
          <blockquote style="border-left:4px solid #c9922a;padding:12px 16px;margin:0 0 24px;background:#fffbeb;border-radius:0 8px 8px 0;font-style:italic;color:#92400e;font-size:13px;line-height:1.6;">
            "Todo lo puedo en Cristo que me fortalece" — Filipenses 4:13
          </blockquote>
          <p style="color:#475569;font-size:13px;line-height:1.7;margin:0;">
            Estamos emocionados de verte en las pistas. Recibirás más detalles del evento próximamente.
            <br /><br />
            ¡Que Dios los bendiga abundantemente! ⛷️
          </p>
        </div>
        <p style="text-align:center;color:#334155;font-size:11px;margin:0;">
          Vencedores Ski Group · <a href="mailto:${process.env.SMTP_USER}" style="color:#7ab8d9;">${process.env.SMTP_USER}</a>
        </p>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `"Vencedores Ski" <${process.env.SMTP_USER}>`,
    to,
    subject: `✓ Registro Confirmado — ${eventName} #${confirmationId}`,
    html,
  })

  console.log(`[Email] Confirmation sent to ${to}`)
}
