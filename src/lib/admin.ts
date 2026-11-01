/**
 * Admin-specific database operations
 * All operations require admin role verification through RLS policies
 */

import { supabase } from './supabase'
import {
  Profile,
  CateringJob,
  Report,
  AdminAuditLog,
  AccountStatus,
  ReportStatus,
} from './database'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AdminStats {
  totalUsers: number
  totalProviders: number
  totalWorkers: number
  totalAdmins: number
  totalJobs: number
  activeJobs: number
  upcomingJobs: number
  completedJobs: number
  cancelledJobs: number
  openVacancies: number
  pendingReports: number
}

export interface UserSearchFilters {
  search?: string
  role?: string
  accountStatus?: string
}

export interface JobSearchFilters {
  search?: string
  status?: string
  providerId?: string
}

// ============================================================================
// Admin Dashboard Stats
// ============================================================================

/**
 * Get admin dashboard statistics
 * Requires admin role (enforced by RLS)
 */
export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    // Get user counts by role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('role', { count: 'exact', head: false })

    if (profilesError) throw profilesError

    const totalUsers = profiles?.length || 0
    const totalProviders = profiles?.filter(p => p.role === 'provider').length || 0
    const totalWorkers = profiles?.filter(p => p.role === 'worker').length || 0
    const totalAdmins = profiles?.filter(p => p.role === 'admin').length || 0

    // Get job counts by status
    const { data: jobs, error: jobsError } = await supabase
      .from('catering_jobs')
      .select('status, event_date, required_workers, confirmed_workers', {
        count: 'exact',
        head: false,
      })
      .is('deleted_at', null)

    if (jobsError) throw jobsError

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalJobs = jobs?.length || 0
    const activeJobs = jobs?.filter(j => ['open', 'full'].includes(j.status || '')).length || 0
    const upcomingJobs =
      jobs?.filter(j => {
        const eventDate = new Date(j.event_date)
        return eventDate >= today && ['open', 'full'].includes(j.status || '')
      }).length || 0
    const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0
    const cancelledJobs = jobs?.filter(j => j.status === 'cancelled').length || 0

    // Calculate open vacancies
    const openVacancies =
      jobs
        ?.filter(j => j.status === 'open')
        .reduce((sum, j) => sum + ((j.required_workers || 0) - (j.confirmed_workers || 0)), 0) || 0

    // Get pending reports count
    const { count: pendingReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return {
      totalUsers,
      totalProviders,
      totalWorkers,
      totalAdmins,
      totalJobs,
      activeJobs,
      upcomingJobs,
      completedJobs,
      cancelledJobs,
      openVacancies,
      pendingReports: pendingReports || 0,
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return null
  }
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Search and filter users
 * Requires admin role (enforced by RLS)
 */
export async function searchUsers(
  filters: UserSearchFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<{ users: Profile[]; total: number } | null> {
  try {
    let query = supabase.from('profiles').select('*', { count: 'exact' })

    // Search by name, email (from auth.users), or phone
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(
        `full_name.ilike.${searchTerm},phone_number.ilike.${searchTerm}`
      )
    }

    // Filter by role
    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role)
    }

    // Filter by account status
    if (filters.accountStatus && filters.accountStatus !== 'all') {
      query = query.eq('account_status', filters.accountStatus)
    }

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      users: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error searching users:', error)
    return null
  }
}

/**
 * Get recent users (last 10)
 * Requires admin role (enforced by RLS)
 */
export async function getRecentUsers(limit: number = 10): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent users:', error)
    return []
  }

  return data || []
}

/**
 * Update user account status (suspend/reactivate)
 * Requires admin role (enforced by RLS)
 */
export async function updateUserStatus(
  userId: string,
  status: AccountStatus,
  adminId: string
): Promise<boolean> {
  try {
    // Update user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_status: status })
      .eq('id', userId)

    if (updateError) throw updateError

    // Log admin action
    await logAdminAction({
      adminId,
      action: status === 'suspended' ? 'suspend_user' : 'reactivate_user',
      targetType: 'profile',
      targetId: userId,
      details: { new_status: status },
    })

    return true
  } catch (error) {
    console.error('Error updating user status:', error)
    return false
  }
}

// ============================================================================
// Job Management
// ============================================================================

/**
 * Search and filter jobs
 * Requires admin role (enforced by RLS)
 */
export async function searchJobs(
  filters: JobSearchFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<{ jobs: CateringJob[]; total: number } | null> {
  try {
    let query = supabase.from('catering_jobs').select('*', { count: 'exact' }).is('deleted_at', null)

    // Search by event name or location
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(`event_name.ilike.${searchTerm},location.ilike.${searchTerm}`)
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    // Filter by provider
    if (filters.providerId) {
      query = query.eq('provider_id', filters.providerId)
    }

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      jobs: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error searching jobs:', error)
    return null
  }
}

/**
 * Get recent jobs (last 10)
 * Requires admin role (enforced by RLS)
 */
export async function getRecentJobs(limit: number = 10): Promise<CateringJob[]> {
  const { data, error } = await supabase
    .from('catering_jobs')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent jobs:', error)
    return []
  }

  return data || []
}

/**
 * Remove job (soft delete)
 * Requires admin role
 */
export async function adminRemoveJob(
  jobId: string,
  adminId: string,
  reason?: string
): Promise<boolean> {
  try {
    // Call the soft_delete_job function
    const { error } = await supabase.rpc('soft_delete_job', {
      p_job_id: jobId,
      p_deleted_by: adminId,
      p_deletion_reason: reason || 'Removed by admin',
      p_expires_days: 30,
    })

    if (error) throw error

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'remove_job',
      targetType: 'catering_job',
      targetId: jobId,
      details: { reason },
    })

    return true
  } catch (error) {
    console.error('Error removing job:', error)
    return false
  }
}

/**
 * Restore deleted job
 * Requires admin role
 */
export async function adminRestoreJob(jobId: string, adminId: string): Promise<boolean> {
  try {
    // Call the restore_job function (assuming it exists)
    const { error } = await supabase.rpc('restore_job' as any, {
      p_job_id: jobId,
    })

    if (error) throw error

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'restore_job',
      targetType: 'catering_job',
      targetId: jobId,
      details: {},
    })

    return true
  } catch (error) {
    console.error('Error restoring job:', error)
    return false
  }
}

// ============================================================================
// Reports Management
// ============================================================================

/**
 * Get all reports with filters
 * Requires admin role (enforced by RLS)
 */
export async function getReports(
  statusFilter?: ReportStatus,
  limit: number = 50,
  offset: number = 0
): Promise<{ reports: Report[]; total: number } | null> {
  try {
    let query = supabase.from('reports').select('*', { count: 'exact' })

    if (statusFilter && statusFilter !== 'pending') {
      query = query.eq('status', statusFilter)
    } else if (!statusFilter) {
      query = query.eq('status', 'pending')
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      reports: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching reports:', error)
    return null
  }
}

/**
 * Update report status
 * Requires admin role (enforced by RLS)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId)

    if (error) throw error

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'update_report_status',
      targetType: 'report',
      targetId: reportId,
      details: { new_status: status },
    })

    return true
  } catch (error) {
    console.error('Error updating report status:', error)
    return false
  }
}

// ============================================================================
// Audit Logs
// ============================================================================

/**
 * Log admin action
 * Requires admin role (enforced by RLS)
 */
export async function logAdminAction(params: {
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, any>
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details as any,
    })

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error logging admin action:', error)
    return false
  }
}

/**
 * Get audit logs
 * Requires admin role (enforced by RLS)
 */
export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: AdminAuditLog[]; total: number } | null> {
  try {
    const { data, error, count } = await supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      logs: data || [],
      total: count || 0,
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return null
  }
}
