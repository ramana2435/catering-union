/**
 * Centralized error handling utilities
 * Converts technical errors into user-friendly messages while preserving details for logging
 */

// ============================================================================
// Error Types
// ============================================================================

export interface AppError {
  message: string // User-friendly message
  code?: string // Error code
  technical?: string // Technical details (for logging)
  retry?: boolean // Whether retry is safe
}

export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'conflict'
  | 'notFound'
  | 'timeout'
  | 'unknown'

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify an error into a category
 */
export function classifyError(error: unknown): ErrorCategory {
  const errorMessage = getErrorMessage(error).toLowerCase()
  const errorCode = getErrorCode(error)

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return 'network'
  }

  // Authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('login') ||
    errorMessage.includes('session') ||
    errorMessage.includes('token') ||
    errorCode === 'PGRST301'
  ) {
    return 'authentication'
  }

  // Authorization errors (RLS, permissions)
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('not authorized') ||
    errorMessage.includes('policy') ||
    errorCode === '42501' || // Postgres insufficient_privilege
    errorCode === 'PGRST301' // PostgREST auth required
  ) {
    return 'authorization'
  }

  // Validation errors
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('must be') ||
    errorCode === '23514' // Postgres check_violation
  ) {
    return 'validation'
  }

  // Conflict errors (unique constraint, race conditions)
  // Check BEFORE database errors since 23505 is a specific database code
  if (
    errorMessage.includes('already exists') ||
    errorMessage.includes('already confirmed') ||
    errorMessage.includes('duplicate') ||
    errorMessage.includes('conflict') ||
    errorMessage.includes('full') ||
    errorCode === '23505' // Postgres unique_violation
  ) {
    return 'conflict'
  }

  // Not found errors
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist') ||
    errorCode === 'PGRST116' // PostgREST no rows
  ) {
    return 'notFound'
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'timeout'
  }

  // Database errors (check AFTER conflict since 23505 is specific)
  if (
    errorMessage.includes('database') ||
    errorMessage.includes('postgres') ||
    errorCode?.startsWith('P') ||
    (errorCode?.startsWith('23') && errorCode !== '23505' && errorCode !== '23514')
  ) {
    return 'database'
  }

  return 'unknown'
}

// ============================================================================
// Error Message Extraction
// ============================================================================

/**
 * Extract user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred'

  if (typeof error === 'string') return error

  if (error instanceof Error) return error.message

  if (typeof error === 'object') {
    const err = error as any

    // Supabase/Postgres error
    if (err.message) return err.message

    // HTTP error with details
    if (err.error_description) return err.error_description
    if (err.error) return typeof err.error === 'string' ? err.error : JSON.stringify(err.error)

    // Generic object
    return JSON.stringify(error)
  }

  return 'An unknown error occurred'
}

/**
 * Extract error code if available
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined

  const err = error as any
  return err.code || err.status?.toString() || err.statusCode?.toString()
}

// ============================================================================
// User-Friendly Error Conversion
// ============================================================================

/**
 * Convert any error into a user-friendly AppError
 */
export function toAppError(error: unknown, context?: string): AppError {
  const category = classifyError(error)
  const technicalMessage = getErrorMessage(error)
  const code = getErrorCode(error)

  // Build context prefix
  const contextPrefix = context ? `${context}: ` : ''

  switch (category) {
    case 'network':
      return {
        message: `${contextPrefix}Network error. Please check your connection and try again.`,
        code: code || 'NETWORK_ERROR',
        technical: technicalMessage,
        retry: true,
      }

    case 'authentication':
      return {
        message: `${contextPrefix}Authentication failed. Please sign in again.`,
        code: code || 'AUTH_ERROR',
        technical: technicalMessage,
        retry: false,
      }

    case 'authorization':
      return {
        message: `${contextPrefix}You don't have permission to perform this action.`,
        code: code || 'PERMISSION_DENIED',
        technical: technicalMessage,
        retry: false,
      }

    case 'validation':
      return {
        message: `${contextPrefix}${technicalMessage}`,
        code: code || 'VALIDATION_ERROR',
        technical: technicalMessage,
        retry: false,
      }

    case 'conflict':
      // For conflicts, the technical message is usually user-friendly
      return {
        message: `${contextPrefix}${technicalMessage}`,
        code: code || 'CONFLICT',
        technical: technicalMessage,
        retry: false,
      }

    case 'notFound':
      return {
        message: `${contextPrefix}The requested resource was not found.`,
        code: code || 'NOT_FOUND',
        technical: technicalMessage,
        retry: false,
      }

    case 'timeout':
      return {
        message: `${contextPrefix}The request timed out. Please try again.`,
        code: code || 'TIMEOUT',
        technical: technicalMessage,
        retry: true,
      }

    case 'database':
      return {
        message: `${contextPrefix}A database error occurred. Please try again later.`,
        code: code || 'DATABASE_ERROR',
        technical: technicalMessage,
        retry: true,
      }

    default:
      return {
        message: `${contextPrefix}${technicalMessage || 'An unexpected error occurred. Please try again.'}`,
        code: code || 'UNKNOWN_ERROR',
        technical: technicalMessage,
        retry: true,
      }
  }
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error with appropriate level
 * In development: logs full details
 * In production: logs sanitized version
 */
export function logError(error: unknown, context?: string) {
  const appError = toAppError(error, context)

  if (import.meta.env.DEV) {
    console.error(`[${context || 'Error'}]`, {
      message: appError.message,
      code: appError.code,
      technical: appError.technical,
      original: error,
    })
  } else {
    // Production: log only safe information
    console.error(`[${context || 'Error'}]`, {
      message: appError.message,
      code: appError.code,
    })
  }
}

// ============================================================================
// Booking-Specific Error Handling
// ============================================================================

/**
 * Handle booking-specific errors with clear messaging
 */
export function toBookingError(error: unknown): AppError {
  const message = getErrorMessage(error).toLowerCase()

  if (message.includes('job is full') || message.includes('no vacancies')) {
    return {
      message: 'This job is now full. All positions have been filled.',
      code: 'JOB_FULL',
      technical: getErrorMessage(error),
      retry: false,
    }
  }

  if (message.includes('already confirmed') || message.includes('duplicate')) {
    return {
      message: 'You have already confirmed this job.',
      code: 'ALREADY_CONFIRMED',
      technical: getErrorMessage(error),
      retry: false,
    }
  }

  if (message.includes('cancelled')) {
    return {
      message: 'This job has been cancelled and is no longer available.',
      code: 'JOB_CANCELLED',
      technical: getErrorMessage(error),
      retry: false,
    }
  }

  if (message.includes('expired') || message.includes('past')) {
    return {
      message: 'This job has already passed and can no longer be booked.',
      code: 'JOB_EXPIRED',
      technical: getErrorMessage(error),
      retry: false,
    }
  }

  return toAppError(error, 'Booking')
}

// ============================================================================
// Network Status Helpers
// ============================================================================

/**
 * Check if error is due to being offline
 */
export function isOfflineError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('networkerror') ||
    !navigator.onLine
  )
}

/**
 * Check if operation is safe to retry
 */
export function isSafeToRetry(error: unknown, operationType: 'read' | 'write'): boolean {
  if (operationType === 'read') return true // Always safe to retry reads

  const appError = toAppError(error)
  const category = classifyError(error)

  // Never retry authorization/validation errors
  if (category === 'authorization' || category === 'validation') return false

  // Never retry conflicts
  if (category === 'conflict') return false

  // Retry network/timeout errors for writes only if safe
  return appError.retry === true
}
