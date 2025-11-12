/**
 * Standard API response types
 */

export type ApiSuccessResponse<T = any> = {
  success: true
  data: T
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Error codes used across the application
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_DUPLICATE_EMAIL: 'AUTH_DUPLICATE_EMAIL',
  AUTH_DUPLICATE_USERNAME: 'AUTH_DUPLICATE_USERNAME',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // Validation errors
  VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  VALIDATION_WEAK_PASSWORD: 'VALIDATION_WEAK_PASSWORD',
  VALIDATION_MISSING_FIELDS: 'VALIDATION_MISSING_FIELDS',
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_DUPLICATE: 'VALIDATION_DUPLICATE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Trading errors
  TRADING_INSUFFICIENT_FUNDS: 'TRADING_INSUFFICIENT_FUNDS',
  TRADING_INSUFFICIENT_QUANTITY: 'TRADING_INSUFFICIENT_QUANTITY',
  TRADING_INVALID_QUANTITY: 'TRADING_INVALID_QUANTITY',
  TRADING_STOCK_NOT_OWNED: 'TRADING_STOCK_NOT_OWNED',

  // Stock errors
  STOCK_NOT_FOUND: 'STOCK_NOT_FOUND',

  // External API errors
  EXTERNAL_KIS_API_ERROR: 'EXTERNAL_KIS_API_ERROR',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
