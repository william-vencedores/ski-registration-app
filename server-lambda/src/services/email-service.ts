import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Resend } from 'resend';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const ses = new SESClient({ region: config.email.region });
const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');

let confirmationTemplate: Handlebars.TemplateDelegate | null = null;
let verificationTemplate: Handlebars.TemplateDelegate | null = null;
let zellePendingTemplate: Handlebars.TemplateDelegate | null = null;
let adminNotificationTemplate: Handlebars.TemplateDelegate | null = null;

function getConfirmationTemplate(): Handlebars.TemplateDelegate {
  if (!confirmationTemplate) {
    const html = readFileSync(join(templatesDir, 'confirmation-email.html'), 'utf-8');
    confirmationTemplate = Handlebars.compile(html);
  }
  return confirmationTemplate;
}

function getVerificationTemplate(): Handlebars.TemplateDelegate {
  if (!verificationTemplate) {
    const html = readFileSync(join(templatesDir, 'verification-code-email.html'), 'utf-8');
    verificationTemplate = Handlebars.compile(html);
  }
  return verificationTemplate;
}

function getZellePendingTemplate(): Handlebars.TemplateDelegate {
  if (!zellePendingTemplate) {
    const html = readFileSync(join(templatesDir, 'zelle-pending-email.html'), 'utf-8');
    zellePendingTemplate = Handlebars.compile(html);
  }
  return zellePendingTemplate;
}

function getAdminNotificationTemplate(): Handlebars.TemplateDelegate {
  if (!adminNotificationTemplate) {
    const html = readFileSync(join(templatesDir, 'admin-notification-email.html'), 'utf-8');
    adminNotificationTemplate = Handlebars.compile(html);
  }
  return adminNotificationTemplate;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await ses.send(
      new SendEmailCommand({
        Source: config.email.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      })
    );
    console.info(`[Email] Sent via SES to ${to}`);
    return;
  } catch (e) {
    console.warn(`[Email] SES failed:`, e);
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: config.email.from,
        to,
        subject,
        html,
      });
      console.info(`[Email] Sent via Resend to ${to}`);
      return;
    } catch (e) {
      console.error(`[Email] Resend also failed:`, e);
    }
  }

  console.error(`[Email] All providers failed for ${to}`);
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  if (!config.email.from) {
    console.info(`[Email] Email sender not configured — skipping verification email (code: ${code})`);
    return;
  }

  const html = getVerificationTemplate()({ code });
  await sendEmail(to, 'Vencedores Ski — Verification Code', html);
}

export async function sendConfirmationEmail(
  to: string,
  name: string,
  eventName: string,
  confirmationId: string,
  total: number
): Promise<void> {
  if (!config.email.from) {
    console.info('[Email] Email sender not configured — skipping confirmation email');
    return;
  }

  const now = new Date();
  const date = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const html = getConfirmationTemplate()({
    name,
    eventName,
    confirmationId: `#${confirmationId}`,
    total: `$${total.toFixed(2)} USD`,
    date,
    emailFrom: config.email.from,
  });

  await sendEmail(to, `✓ Registro Confirmado — ${eventName} #${confirmationId}`, html);
}

export async function sendZellePendingEmail(
  to: string,
  name: string,
  eventName: string,
  confirmationId: string,
  amount: number
): Promise<void> {
  if (!config.email.from) {
    console.info('[Email] Email sender not configured — skipping Zelle pending email');
    return;
  }

  const now = new Date();
  const date = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const html = getZellePendingTemplate()({
    name,
    eventName,
    confirmationId: `#${confirmationId}`,
    amount: `$${amount.toFixed(2)} USD`,
    date,
    zelleEmail: config.zelle.email,
    zelleName: config.zelle.recipientName,
    emailFrom: config.email.from,
  });

  await sendEmail(to, `⏳ Registro Recibido (Pago Zelle Pendiente) — ${eventName} #${confirmationId}`, html);
}

export interface AdminNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  eventName: string;
  confirmationId: string;
  paymentMethod: string;
  paymentStatus: string;
  totalPaid: number;
  totalOwed: number;
  zelleAmount?: number;
  headcount?: number;
}

export async function sendAdminNotificationEmail(reg: AdminNotificationData): Promise<void> {
  if (!config.email.from) {
    console.info('[Email] Email sender not configured — skipping admin notification email');
    return;
  }
  if (!config.email.adminNotify) return;

  const isZelle = reg.paymentMethod === 'zelle';
  const now = new Date();
  const date = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Confirmación', value: `#${reg.confirmationId}` },
    { label: 'Correo', value: reg.email },
  ];
  if (reg.phone) rows.push({ label: 'Teléfono', value: reg.phone });
  if (reg.headcount && reg.headcount > 1) {
    rows.push({ label: 'Participantes', value: `${reg.headcount} (incluye ${reg.headcount - 1} menor(es))` });
  }
  rows.push({ label: 'Método', value: isZelle ? 'Zelle' : 'Tarjeta' });
  rows.push({ label: 'Estado', value: reg.paymentStatus });
  if (isZelle) {
    rows.push({ label: 'Monto Zelle (declarado)', value: `$${(reg.zelleAmount ?? 0).toFixed(2)} USD` });
  }
  rows.push({ label: 'Pagado', value: `$${reg.totalPaid.toFixed(2)} USD` });
  rows.push({ label: 'Total', value: `$${reg.totalOwed.toFixed(2)} USD` });
  rows.push({ label: 'Fecha', value: date });

  const html = getAdminNotificationTemplate()({
    name: `${reg.firstName} ${reg.lastName}`,
    eventName: reg.eventName,
    rows,
    isZellePending: isZelle && reg.paymentStatus === 'pending',
    adminUrl: `${config.clientUrl}/admin`,
  });

  await sendEmail(
    config.email.adminNotify,
    `🎿 Nueva inscripción — ${reg.firstName} ${reg.lastName} · ${reg.eventName}`,
    html
  );
}
