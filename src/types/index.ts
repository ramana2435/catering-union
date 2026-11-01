// ============================================================================
// User and Auth Types (aligned with profiles table)
// ============================================================================

export type UserRole = 'worker' | 'provider' | 'admin'
export type AccountStatus = 'active' | 'suspended' | 'pending_verification'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
  phoneNumber?: string
  profileImageUrl?: string
  accountStatus: AccountStatus
  createdAt: string
}

// ============================================================================
// Job Types (aligned with catering_jobs table)
// ============================================================================

export type JobStatus = 'open' | 'full' | 'completed' | 'cancelled'

export interface Job {
  id: string
  providerId: string
  eventName: string
  eventType?: string
  eventDate: string // ISO date string
  startTime?: string
  endTime?: string
  requiredWorkers: number
  confirmedWorkers: number
  address: string
  area?: string
  city?: string
  district?: string
  latitude?: number
  longitude?: number
  googleMapsUrl?: string
  description?: string
  contactPerson?: string
  contactNumber?: string
  imageUrl?: string
  status: JobStatus
  deletedAt?: string
  deletedBy?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Job Confirmation Types (aligned with job_confirmations table)
// ============================================================================

export interface JobConfirmation {
  id: string
  jobId: string
  workerId: string
  status: string
  confirmedAt: string
  cancelledAt?: string
}

// ============================================================================
// Worker Attendance Types (aligned with worker_attendance table)
// ============================================================================

export type AttendanceStatus = 
  | 'confirmed' 
  | 'getting_ready' 
  | 'on_the_way' 
  | 'arrived' 
  | 'present' 
  | 'absent' 
  | 'cancelled'

export interface WorkerAttendanceRecord {
  id: string
  jobId: string
  workerId: string
  attendanceStatus: AttendanceStatus
  arrivalTime?: string
  markedBy?: string
  updatedAt: string
}

// ============================================================================
// Location Sharing Types (aligned with location_sharing_sessions table)
// ============================================================================

export interface LocationSession {
  id: string
  jobId: string
  workerId: string
  latitude?: number
  longitude?: number
  sharingEnabled: boolean
  startedAt: string
  expiresAt?: string
  lastUpdatedAt: string
}

// Legacy location point interface (keep for backward compatibility)
export interface LocationPoint {
  workerId: string
  jobId: string
  latitude: number
  longitude: number
  timestamp: string
}

// ============================================================================
// Report Types (aligned with reports table)
// ============================================================================

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export interface JobReport {
  id: string
  reporterId: string
  jobId: string
  reason: string
  description?: string
  status: ReportStatus
  createdAt: string
}

// ============================================================================
// Admin Audit Log Types (aligned with admin_audit_logs table)
// ============================================================================

export interface AuditLogEntry {
  id: string
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown> | null
  createdAt: string
}

// ============================================================================
// Worker and Provider Types
// Note: These may be used by future features. Core user data is in profiles table.
// ============================================================================

export interface Worker {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  skills: string[]
  rating: number
  completedJobs: number
  isAvailable: boolean
}

export interface Provider {
  id: string
  userId: string
  businessName: string
  contactEmail: string
  contactPhone: string
  address: string
  rating: number
  activeJobCount: number
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
