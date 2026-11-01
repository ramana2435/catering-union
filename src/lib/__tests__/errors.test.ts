/**
 * Error handling utility tests
 */

import { describe, it, expect } from 'vitest'
import {
  classifyError,
  getErrorMessage,
  getErrorCode,
  toAppError,
  toBookingError,
  isOfflineError,
  isSafeToRetry,
} from '../errors'

describe('Error Classification', () => {
  it('should classify network errors correctly', () => {
    const error = new Error('Network request failed')
    expect(classifyError(error)).toBe('network')
  })

  it('should classify authentication errors', () => {
    const error = { message: 'Authentication failed', code: 'PGRST301' }
    expect(classifyError(error)).toBe('authentication')
  })

  it('should classify authorization errors', () => {
    const error = new Error('Permission denied')
    expect(classifyError(error)).toBe('authorization')
  })

  it('should classify validation errors', () => {
    const error = { message: 'Invalid email format' }
    expect(classifyError(error)).toBe('validation')
  })

  it('should classify conflict errors', () => {
    const error = { message: 'Job is already confirmed' }
    expect(classifyError(error)).toBe('conflict')
  })

  it('should classify not found errors', () => {
    const error = { code: 'PGRST116' }
    expect(classifyError(error)).toBe('notFound')
  })

  it('should classify timeout errors', () => {
    const error = new Error('Request timed out')
    expect(classifyError(error)).toBe('timeout')
  })

  it('should classify database errors', () => {
    const error = { message: 'Postgres integrity constraint violation', code: '23000' }
    expect(classifyError(error)).toBe('database')
  })

  it('should return unknown for unclassifiable errors', () => {
    const error = new Error('Something went wrong')
    expect(classifyError(error)).toBe('unknown')
  })
})

describe('Error Message Extraction', () => {
  it('should extract message from Error objects', () => {
    const error = new Error('Test error message')
    expect(getErrorMessage(error)).toBe('Test error message')
  })

  it('should extract message from plain objects', () => {
    const error = { message: 'Object error message' }
    expect(getErrorMessage(error)).toBe('Object error message')
  })

  it('should handle string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error')
  })

  it('should handle null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred')
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
  })

  it('should extract error_description field', () => {
    const error = { error_description: 'Detailed description' }
    expect(getErrorMessage(error)).toBe('Detailed description')
  })
})

describe('Error Code Extraction', () => {
  it('should extract code from error objects', () => {
    const error = { code: 'TEST_CODE' }
    expect(getErrorCode(error)).toBe('TEST_CODE')
  })

  it('should extract status as code', () => {
    const error = { status: 404 }
    expect(getErrorCode(error)).toBe('404')
  })

  it('should return undefined for errors without codes', () => {
    const error = new Error('No code')
    expect(getErrorCode(error)).toBeUndefined()
  })
})

describe('User-Friendly Error Conversion', () => {
  it('should convert network errors', () => {
    const error = new Error('fetch failed')
    const appError = toAppError(error)
    
    expect(appError.message).toContain('Network error')
    expect(appError.retry).toBe(true)
    expect(appError.code).toBe('NETWORK_ERROR')
  })

  it('should convert authentication errors', () => {
    const error = { message: 'Session expired' }
    const appError = toAppError(error)
    
    expect(appError.message).toContain('Authentication failed')
    expect(appError.retry).toBe(false)
  })

  it('should convert authorization errors', () => {
    const error = { message: 'Permission denied', code: '42501' }
    const appError = toAppError(error)
    
    expect(appError.message).toContain("don't have permission")
    expect(appError.retry).toBe(false)
  })

  it('should preserve validation error messages', () => {
    const error = { message: 'Email is required' }
    const appError = toAppError(error, 'Validation')
    
    expect(appError.message).toBe('Validation: Email is required')
    expect(appError.retry).toBe(false)
  })

  it('should add context prefix', () => {
    const error = new Error('Test error')
    const appError = toAppError(error, 'Booking')
    
    expect(appError.message).toContain('Booking:')
  })
})

describe('Booking-Specific Errors', () => {
  it('should detect job full errors', () => {
    const error = { message: 'Job is full' }
    const bookingError = toBookingError(error)
    
    expect(bookingError.code).toBe('JOB_FULL')
    expect(bookingError.message).toContain('now full')
    expect(bookingError.retry).toBe(false)
  })

  it('should detect already confirmed errors', () => {
    const error = { message: 'already confirmed' }
    const bookingError = toBookingError(error)
    
    expect(bookingError.code).toBe('ALREADY_CONFIRMED')
    expect(bookingError.retry).toBe(false)
  })

  it('should detect cancelled job errors', () => {
    const error = { message: 'Job has been cancelled' }
    const bookingError = toBookingError(error)
    
    expect(bookingError.code).toBe('JOB_CANCELLED')
    expect(bookingError.message).toContain('cancelled')
  })

  it('should detect expired job errors', () => {
    const error = { message: 'Job has expired' }
    const bookingError = toBookingError(error)
    
    expect(bookingError.code).toBe('JOB_EXPIRED')
    expect(bookingError.message).toContain('passed')
  })
})

describe('Offline Detection', () => {
  it('should detect fetch failures as offline', () => {
    const error = new Error('Failed to fetch')
    expect(isOfflineError(error)).toBe(true)
  })

  it('should detect network request failures', () => {
    const error = new Error('Network request failed')
    expect(isOfflineError(error)).toBe(true)
  })

  it('should not flag other errors as offline', () => {
    const error = new Error('Validation error')
    expect(isOfflineError(error)).toBe(false)
  })
})

describe('Retry Safety', () => {
  it('should allow retrying read operations', () => {
    const error = new Error('Database error')
    expect(isSafeToRetry(error, 'read')).toBe(true)
  })

  it('should not retry authorization errors for writes', () => {
    const error = { message: 'Permission denied' }
    expect(isSafeToRetry(error, 'write')).toBe(false)
  })

  it('should not retry validation errors', () => {
    const error = { message: 'Invalid input' }
    expect(isSafeToRetry(error, 'write')).toBe(false)
  })

  it('should not retry conflict errors', () => {
    const error = { message: 'Already confirmed' }
    expect(isSafeToRetry(error, 'write')).toBe(false)
  })

  it('should retry network errors for writes', () => {
    const error = new Error('Network error')
    const appError = toAppError(error)
    expect(appError.retry).toBe(true)
  })
})
