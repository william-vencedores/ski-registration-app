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
