import { config } from '../config/index.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export function addCorsHeaders(
  event: APIGatewayProxyEventV2,
  response: APIGatewayProxyResultV2
): APIGatewayProxyResultV2 {
  const origin = event.headers?.origin || '';
  const allowedOrigin = config.cors.allowedOrigins.includes(origin) ? origin : '';

  const headers = {
    ...(typeof response === 'object' && 'headers' in response ? response.headers : {}),
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (typeof response === 'object') {
    return { ...response, headers };
  }
  return response;
}

export function handleCorsPreFlight(event: APIGatewayProxyEventV2): APIGatewayProxyResultV2 | null {
  if (event.requestContext.http.method === 'OPTIONS') {
    const origin = event.headers?.origin || '';
    const allowedOrigin = config.cors.allowedOrigins.includes(origin) ? origin : '';
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  return null;
}
