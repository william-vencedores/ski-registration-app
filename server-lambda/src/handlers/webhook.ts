import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { config } from '../config/index.js';
import { jsonResponse } from '../middleware/error-handler.js';

const stripe = new Stripe(config.stripe.secretKey);

export async function handleWebhook(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const webhookSecret = config.stripe.webhookSecret;

  if (!webhookSecret) {
    console.warn('[Webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification');
    return jsonResponse(200, { received: true });
  }

  const sigHeader = event.headers?.['stripe-signature'] || '';
  const payload = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf-8')
    : event.body || '';

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Webhook] Signature verification failed: ${message}`);
    return jsonResponse(400, `Webhook Error: ${message}`);
  }

  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      console.info(`[Webhook] Payment succeeded: ${stripeEvent.id}`);
      break;
    case 'payment_intent.payment_failed':
      console.error(`[Webhook] Payment failed: ${stripeEvent.id}`);
      break;
    case 'charge.refunded':
      console.info(`[Webhook] Charge refunded: ${stripeEvent.id}`);
      break;
    default:
      console.info(`[Webhook] Unhandled event: ${stripeEvent.type}`);
  }

  return jsonResponse(200, { received: true });
}
