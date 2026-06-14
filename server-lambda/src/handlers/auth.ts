import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as authService from '../services/auth-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';
import { jsonResponse, handleError } from '../middleware/error-handler.js';

export async function handleLogin(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.username || !body.password) {
      return jsonResponse(400, { error: 'Username and password are required' });
    }

    const result = await authService.login(body.username, body.password);
    if (!result) {
      return jsonResponse(401, { error: 'Invalid credentials' });
    }

    return jsonResponse(200, result);
  } catch (e) {
    return handleError(e);
  }
}

export async function handleMe(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const username = requireAuth(event);
    return jsonResponse(200, { username, role: 'admin' });
  } catch (e) {
    return handleError(e);
  }
}
