import Stripe from 'stripe';
import { config } from '../config/index.js';
import * as eventService from './event-service.js';
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

  const price = (event.price as number) || 0;
  const deposit = (event.deposit as number) || 0;

  // Determine the base amount (deposit or full price)
  const baseAmount = partialPayment && deposit > 0 ? deposit : price;

  // Stripe fee: 2.9% + $0.30
  const processing = Math.round((baseAmount * 0.029 + 0.3) * 100) / 100;
  const chargeAmount = baseAmount + processing;
  const amountCents = Math.round(chargeAmount * 100);

  // Calculate full total owed (price + full processing)
  const fullProcessing = Math.round((price * 0.029 + 0.3) * 100) / 100;
  const totalOwed = price + fullProcessing;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    receipt_email: email,
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

  // Processing fee on the remaining amount
  const processing = Math.round((remaining * 0.029 + 0.3) * 100) / 100;
  const chargeAmount = remaining + processing;
  const amountCents = Math.round(chargeAmount * 100);

  const eventName = (reg.eventName as string) || 'Event';

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    receipt_email: email,
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
    processing,
  };
}
