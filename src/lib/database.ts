/**
 * Database helper functions and type-safe query builders for Supabase.
 * All operations respect Row Level Security (RLS) policies.
 */

import { supabase } from './supabase'
import { Database } from '@/types/database.types'

// ============================================================================
// Helper Type Aliases
// ============================================================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type CateringJob = Database['public']['Tables']['catering_jobs']['Row']
export type JobConfirmation = Database['public']['Tables']['job_confirmations']['Row']
export type WorkerAttendance = Database['public']['Tables']['worker_attendance']['Row']
export type LocationSharingSession = Database['public']['Tables']['location_sharing_sessions']['Row']
export type DeletedJob = Database['public']['Tables']['deleted_jobs']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row']

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CateringJobInsert = Database['public']['Tables']['catering_jobs']['Insert']
export type JobConfirmationInsert = Database['public']['Tables']['job_confirmations']['Insert']
export type WorkerAttendanceInsert = Database['public']['Tables']['worker_attendance']['Insert']
export type LocationSharingSessionInsert = Database['public']['Tables']['location_sharing_sessions']['Insert']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']
export type AdminAuditLogInsert = Database['public']['Tables']['admin_audit_logs']['Insert']

// ============================================================================
// Enum Type Guards
// ============================================================================

export type UserRole = 'worker' | 'provider' | 'admin'
export type JobStatus = 'open' | 'full' | 'completed' | 'cancelled'
export type AttendanceStatus = 'confirmed' | 'getting_ready' | 'on_the_way' | 'arrived' | 'present' | 'absent' | 'cancelled'
export type AccountStatus = 'active' | 'suspended' | 'pending_verification'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

/**
 * Type guard for valid user roles
 */
export function isValidRole(role: string): role is UserRole {
  return ['worker', 'provider', 'admin'].includes(role)
}

/**
 * Type guard for valid job statuses
 */
export function isValidJobStatus(status: string): status is JobStatus {
  return ['open', 'full', 'completed', 'cancelled'].includes(status)
}

/**
 * Type guard for valid attendance statuses
 */
export function isValidAttendanceStatus(status: string): status is AttendanceStatus {
  return ['confirmed', 'getting_ready', 'on_the_way', 'arrived', 'present', 'absent', 'cancelled'].includes(status)
}

/**
 * Type guard for valid account statuses
 */
export function isValidAccountStatus(status: string): status is AccountStatus {
  return ['active', 'suspended', 'pending_verification'].includes(status)
}

/**
 * Type guard for valid report statuses
 */
export function isValidReportStatus(status: string): status is ReportStatus {
  return ['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)
}

// ============================================================================
// Profile Query Helpers
// ============================================================================

/**
 * Get the profile of the currently authenticated user.
 * 
 * @returns Promise<Profile | null> - The user's profile or null if not found
 * 
 * @example
 * ```typescript
 * const profile = await getCurrentUserProfile()
 * if (profile) {
 *   console.log(`Welcome, ${profile.full_name}!`)
 * }
 * ```
 * 
 * RLS: Users can only read their own profile with full details
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching current user profile:', error)
    return null
  }

  return data
}

/**
 * Get a profile by user ID (public information only if not current user)
 * 
 * @param userId - The UUID of the user
 * @returns Promise<Profile | null>
 * 
 * RLS: Authenticated users can read public fields (id, full_name, role, profile_image_url)
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

// ============================================================================
// Catering Job Query Helpers
// ============================================================================

export interface JobFilters {
  status?: JobStatus
  eventDate?: string
  area?: string
  city?: string
  district?: string
  providerId?: string
}

/**
 * Get catering jobs with optional filters. Only returns non-deleted jobs.
 * 
 * @param filters - Optional filters for jobs
 * @returns Promise<CateringJob[]> - Array of matching jobs
 * 
 * @example
 * ```typescript
 * // Get all open jobs
 * const openJobs = await getCateringJobs({ status: 'open' })
 * 
 * // Get jobs in specific area on specific date
 * const jobs = await getCateringJobs({ 
 *   area: 'Downtown', 
 *   eventDate: '2024-06-15' 
 * })
 * ```
 * 
 * RLS: Users can view open jobs, their own provider jobs, or jobs they confirmed
 */
export async function getCateringJobs(filters?: JobFilters): Promise<CateringJob[]> {
  let query = supabase
    .from('catering_jobs')
    .select('*')
    .is('deleted_at', null)
    .order('event_date', { ascending: true })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.eventDate) {
    query = query.eq('event_date', filters.eventDate)
  }

  if (filters?.area) {
    query = query.eq('area', filters.area)
  }

  if (filters?.city) {
    query = query.eq('city', filters.city)
  }

  if (filters?.district) {
    query = query.eq('district', filters.district)
  }

  if (filters?.providerId) {
    query = query.eq('provider_id', filters.providerId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching catering jobs:', error)
    return []
  }

  return data || []
}

/**
 * Get a single catering job by ID
 * 
 * @param jobId - The UUID of the job
 * @returns Promise<CateringJob | null>
 * 
 * RLS: Users can view jobs they have access to per RLS policies
 */
export async function getCateringJobById(jobId: string): Promise<CateringJob | null> {
  const { data, error } = await supabase
    .from('catering_jobs')
    .select('*')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching catering job:', error)
    return null
  }

  return data
}

/**
 * Create a new catering job
 * 
 * @param job - Job data to insert
 * @returns Promise<CateringJob | null>
 * 
 * @example
 * ```typescript
 * const newJob = await createCateringJob({
 *   provider_id: currentUserId,
 *   event_name: 'Wedding Reception',
 *   event_date: '2024-08-15',
 *   required_workers: 10,
 *   address: '123 Main St',
 *   city: 'Mumbai'
 * })
 * ```
 * 
 * RLS: Only providers can create jobs with provider_id = auth.uid()
 */
export async function createCateringJob(job: CateringJobInsert): Promise<CateringJob | null> {
  const { data, error } = await supabase
    .from('catering_jobs')
    .insert(job)
    .select()
    .single()

  if (error) {
    console.error('Error creating catering job:', error)
    return null
  }

  return data
}

/**
 * Update a catering job
 * 
 * @param jobId - The UUID of the job to update
 * @param updates - Partial job data to update
 * @returns Promise<CateringJob | null>
 * 
 * RLS: Only the provider who owns the job can update it
 */
export async function updateCateringJob(
  jobId: string,
  updates: Partial<CateringJobInsert>
): Promise<CateringJob | null> {
  const { data, error } = await supabase
    .from('catering_jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    console.error('Error updating catering job:', error)
    return null
  }

  return data
}

// ============================================================================
// Job Confirmation Helpers
// ============================================================================

/**
 * Confirm a job for the current worker
 * 
 * @param jobId - The UUID of the job to confirm
 * @param workerId - The UUID of the worker (must match auth.uid())
 * @returns Promise<JobConfirmation | null>
 * 
 * @example
 * ```typescript
 * const confirmation = await confirmJob(jobId, currentUserId)
 * if (confirmation) {
 *   console.log('Job confirmed successfully!')
 * }
 * ```
 * 
 * RLS: Workers can only confirm jobs for themselves (worker_id = auth.uid())
 */
export async function confirmJob(jobId: string, workerId: string): Promise<JobConfirmation | null> {
  const { data, error } = await supabase
    .from('job_confirmations')
    .insert({
      job_id: jobId,
      worker_id: workerId,
      status: 'confirmed'
    })
    .select()
    .single()

  if (error) {
    console.error('Error confirming job:', error)
    return null
  }

  return data
}

/**
 * Get confirmations for a specific job
 * 
 * @param jobId - The UUID of the job
 * @returns Promise<JobConfirmation[]>
 * 
 * RLS: Providers can view confirmations for their jobs, workers can view their own
 */
export async function getJobConfirmations(jobId: string): Promise<JobConfirmation[]> {
  const { data, error } = await supabase
    .from('job_confirmations')
    .select('*')
    .eq('job_id', jobId)
    .order('confirmed_at', { ascending: false })

  if (error) {
    console.error('Error fetching job confirmations:', error)
    return []
  }

  return data || []
}

/**
 * Cancel a job confirmation
 * 
 * @param confirmationId - The UUID of the confirmation to cancel
 * @returns Promise<boolean> - Success status
 * 
 * RLS: Workers can cancel their own confirmations
 */
export async function cancelJobConfirmation(confirmationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('job_confirmations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', confirmationId)

  if (error) {
    console.error('Error cancelling job confirmation:', error)
    return false
  }

  return true
}

// ============================================================================
// Attendance Helpers
// ============================================================================

/**
 * Update worker attendance status
 * 
 * @param attendanceId - The UUID of the attendance record
 * @param status - New attendance status
 * @param markedBy - UUID of user marking attendance (optional)
 * @returns Promise<WorkerAttendance | null>
 * 
 * @example
 * ```typescript
 * // Worker updates their own status
 * await updateAttendance(attendanceId, 'on_the_way')
 * 
 * // Provider marks worker as present
 * await updateAttendance(attendanceId, 'present', providerId)
 * ```
 * 
 * RLS: Workers can update own status, providers can mark attendance for their jobs
 */
export async function updateAttendance(
  attendanceId: string,
  status: AttendanceStatus,
  markedBy?: string
): Promise<WorkerAttendance | null> {
  const updates: Partial<WorkerAttendanceInsert> = {
    attendance_status: status,
    updated_at: new Date().toISOString()
  }

  if (markedBy) {
    updates.marked_by = markedBy
  }

  if (status === 'arrived' || status === 'present') {
    updates.arrival_time = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('worker_attendance')
    .update(updates)
    .eq('id', attendanceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating attendance:', error)
    return null
  }

  return data
}

/**
 * Get attendance records for a job
 * 
 * @param jobId - The UUID of the job
 * @returns Promise<WorkerAttendance[]>
 * 
 * RLS: Providers can view attendance for their jobs, workers can view own attendance
 */
export async function getJobAttendance(jobId: string): Promise<WorkerAttendance[]> {
  const { data, error } = await supabase
    .from('worker_attendance')
    .select('*')
    .eq('job_id', jobId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching job attendance:', error)
    return []
  }

  return data || []
}

/**
 * Create attendance record for a worker
 * 
 * @param jobId - The UUID of the job
 * @param workerId - The UUID of the worker
 * @returns Promise<WorkerAttendance | null>
 * 
 * RLS: Providers can create attendance for confirmed workers on their jobs
 */
export async function createAttendanceRecord(
  jobId: string,
  workerId: string
): Promise<WorkerAttendance | null> {
  const { data, error } = await supabase
    .from('worker_attendance')
    .insert({
      job_id: jobId,
      worker_id: workerId,
      attendance_status: 'confirmed'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating attendance record:', error)
    return null
  }

  return data
}

// ============================================================================
// Location Sharing Helpers
// ============================================================================

/**
 * Start location sharing session for a job
 * 
 * @param jobId - The UUID of the job
 * @param workerId - The UUID of the worker
 * @param expiresInMinutes - How long the session should last (default: 480 = 8 hours)
 * @returns Promise<LocationSharingSession | null>
 * 
 * @example
 * ```typescript
 * // Start 8-hour location sharing session
 * const session = await startLocationSharing(jobId, workerId, 480)
 * ```
 * 
 * RLS: Workers can only start sessions for jobs they confirmed
 */
export async function startLocationSharing(
  jobId: string,
  workerId: string,
  expiresInMinutes: number = 480
): Promise<LocationSharingSession | null> {
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

  const { data, error } = await supabase
    .from('location_sharing_sessions')
    .insert({
      job_id: jobId,
      worker_id: workerId,
      sharing_enabled: true,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting location sharing:', error)
    return null
  }

  return data
}

/**
 * Update worker location in an active session
 * 
 * @param sessionId - The UUID of the location sharing session
 * @param latitude - Current latitude
 * @param longitude - Current longitude
 * @returns Promise<LocationSharingSession | null>
 * 
 * RLS: Workers can only update their own sessions
 */
export async function updateWorkerLocation(
  sessionId: string,
  latitude: number,
  longitude: number
): Promise<LocationSharingSession | null> {
  const { data, error } = await supabase
    .from('location_sharing_sessions')
    .update({
      latitude,
      longitude,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    console.error('Error updating worker location:', error)
    return null
  }

  return data
}

/**
 * Stop location sharing
 * 
 * @param sessionId - The UUID of the location sharing session
 * @returns Promise<boolean> - Success status
 * 
 * RLS: Workers can stop their own sessions
 */
export async function stopLocationSharing(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('location_sharing_sessions')
    .update({ sharing_enabled: false })
    .eq('id', sessionId)

  if (error) {
    console.error('Error stopping location sharing:', error)
    return false
  }

  return true
}

/**
 * Get active location sessions for a job (provider view)
 * 
 * @param jobId - The UUID of the job
 * @returns Promise<LocationSharingSession[]>
 * 
 * RLS: Providers can view sessions for confirmed workers on their jobs
 */
export async function getJobLocationSessions(jobId: string): Promise<LocationSharingSession[]> {
  const { data, error } = await supabase
    .from('location_sharing_sessions')
    .select('*')
    .eq('job_id', jobId)
    .eq('sharing_enabled', true)
    .gt('expires_at', new Date().toISOString())

  if (error) {
    console.error('Error fetching location sessions:', error)
    return []
  }

  return data || []
}

// ============================================================================
// Report Helpers
// ============================================================================

/**
 * Submit a report about a job
 * 
 * @param reporterId - UUID of the user submitting the report
 * @param jobId - UUID of the job being reported
 * @param reason - Reason for the report
 * @param description - Optional detailed description
 * @returns Promise<Report | null>
 * 
 * @example
 * ```typescript
 * const report = await submitJobReport(
 *   currentUserId,
 *   jobId,
 *   'fake_job',
 *   'This appears to be a scam posting'
 * )
 * ```
 * 
 * RLS: Authenticated users can submit reports
 */
export async function submitJobReport(
  reporterId: string,
  jobId: string,
  reason: string,
  description?: string
): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      job_id: jobId,
      reason,
      description
    })
    .select()
    .single()

  if (error) {
    console.error('Error submitting report:', error)
    return null
  }

  return data
}

/**
 * Get all reports (admin only)
 * 
 * @param status - Optional filter by report status
 * @returns Promise<Report[]>
 * 
 * RLS: Only admins can view all reports
 */
export async function getReports(status?: ReportStatus): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching reports:', error)
    return []
  }

  return data || []
}

// ============================================================================
// Admin Helpers
// ============================================================================

/**
 * Log an admin action to the audit trail
 * 
 * @param action - Description of the action taken
 * @param targetType - Type of entity affected (e.g., 'job', 'user', 'report')
 * @param targetId - UUID of the affected entity
 * @param details - Additional details as JSON object
 * @returns Promise<AdminAuditLog | null>
 * 
 * @example
 * ```typescript
 * await logAdminAction(
 *   'suspend_user',
 *   'profile',
 *   userId,
 *   { reason: 'Terms violation', duration: '30 days' }
 * )
 * ```
 * 
 * RLS: Only admins can create audit logs
 */
export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<AdminAuditLog | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('No authenticated user for admin action')
    return null
  }

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details as Database['public']['Tables']['admin_audit_logs']['Insert']['details']
    })
    .select()
    .single()

  if (error) {
    console.error('Error logging admin action:', error)
    return null
  }

  return data
}

/**
 * Soft delete a catering job
 * 
 * @param jobId - The UUID of the job to delete
 * @param reason - Reason for deletion
 * @returns Promise<boolean> - Success status
 * 
 * @example
 * ```typescript
 * const success = await softDeleteJob(jobId, 'Event cancelled by client')
 * ```
 * 
 * RLS: Providers can soft delete their own jobs
 */
export async function softDeleteJob(jobId: string, reason?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('No authenticated user for soft delete')
    return false
  }

  const { error } = await supabase
    .from('catering_jobs')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id
    })
    .eq('id', jobId)

  if (error) {
    console.error('Error soft deleting job:', error)
    return false
  }

  // Optionally create a deleted_jobs record
  if (reason) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days retention

    await supabase
      .from('deleted_jobs')
      .insert({
        original_job_id: jobId,
        provider_id: user.id,
        deleted_by: user.id,
        deletion_reason: reason,
        expires_at: expiresAt.toISOString()
      })
  }

  return true
}

// ============================================================================
// Snake Case to CamelCase Converters
// ============================================================================

/**
 * Convert database profile row (snake_case) to frontend Profile type (camelCase)
 */
export function dbProfileToProfile(dbRow: Profile) {
  return {
    id: dbRow.id,
    fullName: dbRow.full_name,
    phoneNumber: dbRow.phone_number,
    role: dbRow.role as UserRole,
    preferredLanguage: dbRow.preferred_language,
    profileImageUrl: dbRow.profile_image_url,
    accountStatus: dbRow.account_status as AccountStatus,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at
  }
}

/**
 * Convert database catering_jobs row (snake_case) to frontend Job type (camelCase)
 */
export function dbJobToCateringJob(dbRow: CateringJob) {
  return {
    id: dbRow.id,
    providerId: dbRow.provider_id,
    eventName: dbRow.event_name,
    eventType: dbRow.event_type,
    eventDate: dbRow.event_date,
    startTime: dbRow.start_time,
    endTime: dbRow.end_time,
    requiredWorkers: dbRow.required_workers,
    confirmedWorkers: dbRow.confirmed_workers,
    address: dbRow.address,
    area: dbRow.area,
    city: dbRow.city,
    district: dbRow.district,
    latitude: dbRow.latitude,
    longitude: dbRow.longitude,
    googleMapsUrl: dbRow.google_maps_url,
    description: dbRow.description,
    contactPerson: dbRow.contact_person,
    contactNumber: dbRow.contact_number,
    imageUrl: dbRow.image_url,
    status: dbRow.status as JobStatus,
    deletedAt: dbRow.deleted_at,
    deletedBy: dbRow.deleted_by,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at
  }
}

/**
 * Convert database job_confirmations row (snake_case) to camelCase
 */
export function dbConfirmationToConfirmation(dbRow: JobConfirmation) {
  return {
    id: dbRow.id,
    jobId: dbRow.job_id,
    workerId: dbRow.worker_id,
    status: dbRow.status,
    confirmedAt: dbRow.confirmed_at,
    cancelledAt: dbRow.cancelled_at
  }
}

/**
 * Convert database worker_attendance row (snake_case) to camelCase
 */
export function dbAttendanceToAttendance(dbRow: WorkerAttendance) {
  return {
    id: dbRow.id,
    jobId: dbRow.job_id,
    workerId: dbRow.worker_id,
    attendanceStatus: dbRow.attendance_status as AttendanceStatus,
    arrivalTime: dbRow.arrival_time,
    markedBy: dbRow.marked_by,
    updatedAt: dbRow.updated_at
  }
}

/**
 * Convert database location_sharing_sessions row (snake_case) to camelCase
 */
export function dbLocationSessionToLocationSession(dbRow: LocationSharingSession) {
  return {
    id: dbRow.id,
    jobId: dbRow.job_id,
    workerId: dbRow.worker_id,
    latitude: dbRow.latitude,
    longitude: dbRow.longitude,
    sharingEnabled: dbRow.sharing_enabled,
    startedAt: dbRow.started_at,
    expiresAt: dbRow.expires_at,
    lastUpdatedAt: dbRow.last_updated_at
  }
}

/**
 * Convert database reports row (snake_case) to camelCase
 */
export function dbReportToReport(dbRow: Report) {
  return {
    id: dbRow.id,
    reporterId: dbRow.reporter_id,
    jobId: dbRow.job_id,
    reason: dbRow.reason,
    description: dbRow.description,
    status: dbRow.status as ReportStatus,
    createdAt: dbRow.created_at
  }
}

/**
 * Convert database admin_audit_logs row (snake_case) to camelCase
 */
export function dbAuditLogToAuditLog(dbRow: AdminAuditLog) {
  return {
    id: dbRow.id,
    adminId: dbRow.admin_id,
    action: dbRow.action,
    targetType: dbRow.target_type,
    targetId: dbRow.target_id,
    details: dbRow.details,
    createdAt: dbRow.created_at
  }
}
