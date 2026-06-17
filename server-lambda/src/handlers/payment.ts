import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as paymentService from '../services/payment-service.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleCreateIntent(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const result = await paymentService.createPaymentIntent(
      body.eventId,
      body.email,
      body.name,
      body.partialPayment,
      Array.isArray(body.minors) ? body.minors.length : (body.minorsCount ?? 0)
    );
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function handleCreateBalanceIntent(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const result = await paymentService.createBalancePaymentIntent(
      body.registrationId,
      body.email,
      body.name
    );
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function handleCreateMinorsIntent(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const result = await paymentService.createMinorsPaymentIntent(
      body.guardianRegId,
      Array.isArray(body.minors) ? body.minors.length : (body.minorsCount ?? 0),
      body.partialPayment
    );
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}
