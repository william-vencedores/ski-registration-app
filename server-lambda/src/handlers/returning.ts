import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as verificationService from '../services/verification-service.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleSendCode(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.email?.trim()) {
      return jsonResponse(400, { error: 'Email is required' });
    }
    await verificationService.sendVerificationCode(body.email);
    // Always return success to prevent email enumeration
    return jsonResponse(200, { success: true, message: 'If this email has a registration, a code was sent.' });
  } catch (e) {
    return handleError(e);
  }
}

export async function handleVerifyCode(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.email?.trim() || !body.code?.trim()) {
      return jsonResponse(400, { error: 'Email and code are required' });
    }
    const result = await verificationService.verifyCode(body.email, body.code);
    if (result.verified) {
      return jsonResponse(200, result);
    }
    return jsonResponse(401, result);
  } catch (e) {
    return handleError(e);
  }
}
