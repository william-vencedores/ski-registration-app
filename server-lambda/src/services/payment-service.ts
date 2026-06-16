import Stripe from 'stripe';
import { config } from '../config/index.js';
import * as eventService from './event-service.js';
import * as registrationService from './registration-service.js';
import * as repo from '../repository/dynamo-repository.js';
import { BadRequestError } from '../middleware/error-handler.js';

const stripe = new Stripe(config.stripe.secretKey);

export async function createPaymentIntent(
  eventId: string,
  email: string,
  name: string,
  partialPayment: boolean
): Promise<Record<string, unknown>> {
  const event = await eventService.getEvent(eventId);

  // Safety net: never charge a card for someone already registered for this event.
  // The client also gates this earlier, but this guarantees no duplicate charge.
  if (await registrationService.isAlreadyRegistered(eventId, email)) {
    throw new BadRequestError('You are already registered for this event.');
  }

  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;

  // Determine the base amount (deposit or full price)
  const baseAmount = partialPayment && deposit > 0 ? deposit : price;

  // The event price already covers card processing costs, so we charge the base
  // amount with no added fee — card and Zelle cost the participant the same.
  const chargeAmount = baseAmount;
  const amountCents = Math.round(chargeAmount * 100);
  const totalOwed = price;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    // No receipt_email: we send our own confirmation email, so this avoids
    // Stripe also emailing its branded receipt in live mode.
    // Enable cards + wallets (Apple Pay / Google Pay / Link). allow_redirects: 'never'
    // keeps it to no-redirect methods so the embedded one-page flow needs no return_url.
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      eventId,
      name,
      email,
      partialPayment: String(partialPayment),
    },
    description: `Vencedores Ski — ${event.name}${partialPayment && deposit > 0 ? ' (Deposit)' : ''}`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    chargeAmount,
    totalOwed,
  };
}

export async function createBalancePaymentIntent(
  registrationId: string,
  email: string,
  name: string
): Promise<Record<string, unknown>> {
  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${registrationId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new BadRequestError('Registration not found');
  }

  const reg = items[0];
  const totalPaid = (reg.totalPaid as number) || 0;
  const totalOwed = (reg.totalOwed as number) || 0;
  const remaining = totalOwed - totalPaid;

  if (remaining <= 0) {
    throw new BadRequestError('No balance remaining');
  }

  // No added processing fee — the event price already accounts for it.
  const chargeAmount = remaining;
  const amountCents = Math.round(chargeAmount * 100);

  const eventName = (reg.eventName as string) || 'Event';

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    // No receipt_email — we send our own confirmation email (see createPaymentIntent).
    // Enable cards + wallets (Apple Pay / Google Pay / Link); allow_redirects: 'never'
    // keeps the balance payment on one page with no return_url navigation.
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      registrationId,
      balancePayment: 'true',
      email,
    },
    description: `Vencedores Ski — ${eventName} (Remaining Balance)`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    chargeAmount,
    remaining,
  };
}
