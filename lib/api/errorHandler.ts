import { NextResponse } from 'next/server';

/**
 * Standard API error response format
 */
export type ApiErrorResponse = {
  error: string;
  details?: string;
  status?: number;
};

/**
 * Wraps an API route handler with error handling
 *
 * @param handler - The async function to execute
 * @param errorMessage - The error message to return if handler fails
 * @returns NextResponse with either the result or an error
 *
 * @example
 * export async function GET(req: Request) {
 *   return withErrorHandling(
 *     async () => {
 *       const data = await fetchData();
 *       return { data };
 *     },
 *     'Failed to fetch data'
 *   );
 * }
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorMessage: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    const result = await handler();
    return NextResponse.json(result as T);
  } catch (error) {
    console.error(`${errorMessage}:`, error);

    const details = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = getStatusCode(error);

    return NextResponse.json(
      {
        error: errorMessage,
        details,
      } as ApiErrorResponse,
      { status: statusCode }
    );
  }
}

/**
 * Determine HTTP status code from error
 */
function getStatusCode(error: unknown): number {
  // Check for custom status codes on error objects
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as any).statusCode;
    if (typeof code === 'number') return code;
  }

  // Default to 500 Internal Server Error
  return 500;
}

/**
 * Validates required environment variables are set
 *
 * @param vars - Object mapping variable names to their values
 * @throws Error if any variable is missing
 *
 * @example
 * validateEnvVars({
 *   TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
 *   TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET
 * });
 */
export function validateEnvVars(vars: Record<string, string | undefined>): void {
  const missing = Object.entries(vars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing required environment variables: ${missing.join(', ')}`),
      { statusCode: 500 }
    );
  }
}

/**
 * Validates request body parameters
 *
 * @param body - The request body
 * @param required - Array of required field names
 * @throws Error if any required field is missing
 *
 * @example
 * const body = await request.json();
 * validateRequestBody(body, ['channelLogin', 'userId']);
 */
export function validateRequestBody(
  body: any,
  required: string[]
): void {
  const missing = required.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw Object.assign(
      new Error(`Missing required fields: ${missing.join(', ')}`),
      { statusCode: 400 }
    );
  }
}
