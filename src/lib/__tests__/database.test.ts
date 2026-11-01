/**
 * Database helper function tests
 * These are unit tests with mocked Supabase client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  isValidRole,
  isValidJobStatus,
  isValidAttendanceStatus,
  isValidAccountStatus,
  isValidReportStatus,
} from '../database'

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Type Guards', () => {
  describe('isValidRole', () => {
    it('should accept valid roles', () => {
      expect(isValidRole('worker')).toBe(true)
      expect(isValidRole('provider')).toBe(true)
      expect(isValidRole('admin')).toBe(true)
    })

    it('should reject invalid roles', () => {
      expect(isValidRole('superadmin')).toBe(false)
      expect(isValidRole('guest')).toBe(false)
      expect(isValidRole('')).toBe(false)
    })
  })

  describe('isValidJobStatus', () => {
    it('should accept valid job statuses', () => {
      expect(isValidJobStatus('open')).toBe(true)
      expect(isValidJobStatus('full')).toBe(true)
      expect(isValidJobStatus('completed')).toBe(true)
      expect(isValidJobStatus('cancelled')).toBe(true)
    })

    it('should reject invalid job statuses', () => {
      expect(isValidJobStatus('pending')).toBe(false)
      expect(isValidJobStatus('in_progress')).toBe(false)
      expect(isValidJobStatus('')).toBe(false)
    })
  })

  describe('isValidAttendanceStatus', () => {
    it('should accept valid attendance statuses', () => {
      expect(isValidAttendanceStatus('confirmed')).toBe(true)
      expect(isValidAttendanceStatus('getting_ready')).toBe(true)
      expect(isValidAttendanceStatus('on_the_way')).toBe(true)
      expect(isValidAttendanceStatus('arrived')).toBe(true)
      expect(isValidAttendanceStatus('present')).toBe(true)
      expect(isValidAttendanceStatus('absent')).toBe(true)
      expect(isValidAttendanceStatus('cancelled')).toBe(true)
    })

    it('should reject invalid attendance statuses', () => {
      expect(isValidAttendanceStatus('maybe')).toBe(false)
      expect(isValidAttendanceStatus('late')).toBe(false)
      expect(isValidAttendanceStatus('')).toBe(false)
    })
  })

  describe('isValidAccountStatus', () => {
    it('should accept valid account statuses', () => {
      expect(isValidAccountStatus('active')).toBe(true)
      expect(isValidAccountStatus('suspended')).toBe(true)
      expect(isValidAccountStatus('pending_verification')).toBe(true)
    })

    it('should reject invalid account statuses', () => {
      expect(isValidAccountStatus('banned')).toBe(false)
      expect(isValidAccountStatus('deleted')).toBe(false)
      expect(isValidAccountStatus('')).toBe(false)
    })
  })

  describe('isValidReportStatus', () => {
    it('should accept valid report statuses', () => {
      expect(isValidReportStatus('pending')).toBe(true)
      expect(isValidReportStatus('reviewed')).toBe(true)
      expect(isValidReportStatus('resolved')).toBe(true)
      expect(isValidReportStatus('dismissed')).toBe(true)
    })

    it('should reject invalid report statuses', () => {
      expect(isValidReportStatus('open')).toBe(false)
      expect(isValidReportStatus('closed')).toBe(false)
      expect(isValidReportStatus('')).toBe(false)
    })
  })
})

describe('Atomic Booking Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call confirm_worker_for_job RPC with correct parameters', async () => {
    const mockResult = {
      success: true,
      code: 'CONFIRMED',
      message: 'Job confirmed successfully',
      confirmation_id: 'test-uuid',
      confirmed_workers: 1,
      required_workers: 5,
      is_now_full: false,
    }

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockResult,
      error: null,
    } as any)

    const { confirmJobAtomic } = await import('../database')
    const result = await confirmJobAtomic('job-id', 'worker-id')

    expect(supabase.rpc).toHaveBeenCalledWith('confirm_worker_for_job', {
      p_job_id: 'job-id',
      p_worker_id: 'worker-id',
    })
    expect(result.success).toBe(true)
    expect(result.code).toBe('CONFIRMED')
  })

  it('should handle RPC errors gracefully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'DB_ERROR' },
    } as any)

    const { confirmJobAtomic } = await import('../database')
    const result = await confirmJobAtomic('job-id', 'worker-id')

    expect(result.success).toBe(false)
    expect(result.code).toBe('ERROR')
  })
})

describe('Cancellation Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call cancel_worker_confirmation RPC', async () => {
    const mockResult = {
      success: true,
      code: 'CANCELLED',
      message: 'Confirmation cancelled successfully',
    }

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockResult,
      error: null,
    } as any)

    const { cancelConfirmationAtomic } = await import('../database')
    const result = await cancelConfirmationAtomic('confirmation-id', 'worker-id')

    expect(supabase.rpc).toHaveBeenCalledWith('cancel_worker_confirmation', {
      p_confirmation_id: 'confirmation-id',
      p_worker_id: 'worker-id',
    })
    expect(result.success).toBe(true)
    expect(result.code).toBe('CANCELLED')
  })
})
