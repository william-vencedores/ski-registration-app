import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const ses = new SESClient({ region: config.email.region });

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', '..', 'templates');

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

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  if (!config.email.from) {
    console.info(`[Email] Email sender not configured — skipping verification email (code: ${code})`);
    return;
  }

  try {
    const html = getVerificationTemplate()({ code });
    await ses.send(
      new SendEmailCommand({
        Source: config.email.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: 'Vencedores Ski — Verification Code', Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      })
    );
    console.info(`[Email] Verification code sent to ${to}`);
  } catch (e) {
    console.error(`[Email] Failed to send verification code:`, e);
  }
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

  try {
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

    await ses.send(
      new SendEmailCommand({
        Source: config.email.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: {
            Data: `✓ Registro Confirmado — ${eventName} #${confirmationId}`,
            Charset: 'UTF-8',
          },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      })
    );
    console.info(`[Email] Confirmation sent to ${to}`);
  } catch (e) {
    console.error('[Email] Failed to send confirmation:', e);
  }
}
