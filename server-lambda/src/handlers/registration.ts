import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as registrationService from '../services/registration-service.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleSubmit(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const result = await registrationService.submitRegistration(body);
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function handlePayBalance(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    const result = await registrationService.payBalance(body.registrationId, body.amountPaid);
    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}
