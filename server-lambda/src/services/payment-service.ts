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
  partialPayment: boolean,
  minorsCount: number = 0
): Promise<Record<string, unknown>> {
  const event = await eventService.getEvent(eventId);

  // Safety net: never charge a card for someone already registered for this event.
  // The client also gates this earlier, but this guarantees no duplicate charge.
  if (await registrationService.isAlreadyRegistered(eventId, email)) {
    throw new BadRequestError('You are already registered for this event.');
  }

  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;

  // Determine the base amount per person (deposit or full price)
  const baseAmount = partialPayment && deposit > 0 ? deposit : price;

  // Headcount = the registrant plus any minors they bring; every head pays the
  // same per-person price (no added processing fee — the event price covers it).
  const headcount = 1 + Math.max(0, Math.floor(minorsCount));
  const chargeAmount = baseAmount * headcount;
  const amountCents = Math.round(chargeAmount * 100);
  const totalOwed = price * headcount;

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
      headcount: String(headcount),
    },
    description: `Vencedores Ski — ${event.name}${headcount > 1 ? ` (${headcount} participants)` : ''}${partialPayment && deposit > 0 ? ' (Deposit)' : ''}`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    chargeAmount,
    totalOwed,
    headcount,
  };
}

/**
 * PaymentIntent for adding minors to an *existing* registration. The guardian
 * is already registered (so the normal create-intent duplicate guard would
 * block them); here we charge only for the additional minors.
 */
export async function createMinorsPaymentIntent(
  guardianRegId: string,
  minorsCount: number,
  partialPayment: boolean
): Promise<Record<string, unknown>> {
  const count = Math.max(0, Math.floor(minorsCount));
  if (count < 1) {
    throw new BadRequestError('At least one minor is required');
  }

  const items = await repo.queryGsi('GSI1', 'GSI1PK', `REG#${guardianRegId}`, 'GSI1SK', null);
  if (items.length === 0) {
    throw new BadRequestError('Registration not found');
  }
  const guardian = items[0];
  if (guardian.isMinor === true) {
    throw new BadRequestError('Cannot add minors to a minor registration');
  }

  const eventId = guardian.eventId as string;
  const event = await eventService.getEvent(eventId);
  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;
  const baseAmount = partialPayment && deposit > 0 ? deposit : price;

  const chargeAmount = baseAmount * count;
  const amountCents = Math.round(chargeAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: {
      guardianRegId,
      eventId,
      minorsOnly: 'true',
      minorsCount: String(count),
    },
    description: `Vencedores Ski — ${event.name} (${count} minor${count > 1 ? 's' : ''})`,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    chargeAmount,
    minorsCount: count,
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
