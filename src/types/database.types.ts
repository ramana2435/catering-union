/**
 * AUTO-GENERATED - Do not edit manually.
 * Regenerate after schema changes with:
 * supabase gen types typescript --project-ref YOUR_PROJECT_REF > src/types/database.types.ts
 * 
 * Or via npm script: npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone_number: string | null
          role: string
          preferred_language: string
          profile_image_url: string | null
          account_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone_number?: string | null
          role: string
          preferred_language?: string
          profile_image_url?: string | null
          account_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone_number?: string | null
          role?: string
          preferred_language?: string
          profile_image_url?: string | null
          account_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      catering_jobs: {
        Row: {
          id: string
          provider_id: string
          event_name: string
          event_type: string | null
          event_date: string
          start_time: string | null
          end_time: string | null
          required_workers: number
          confirmed_workers: number
          address: string
          area: string | null
          city: string | null
          district: string | null
          latitude: number | null
          longitude: number | null
          google_maps_url: string | null
          description: string | null
          contact_person: string | null
          contact_number: string | null
          image_url: string | null
          status: string
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          event_name: string
          event_type?: string | null
          event_date: string
          start_time?: string | null
          end_time?: string | null
          required_workers: number
          confirmed_workers?: number
          address: string
          area?: string | null
          city?: string | null
          district?: string | null
          latitude?: number | null
          longitude?: number | null
          google_maps_url?: string | null
          description?: string | null
          contact_person?: string | null
          contact_number?: string | null
          image_url?: string | null
          status?: string
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          event_name?: string
          event_type?: string | null
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          required_workers?: number
          confirmed_workers?: number
          address?: string
          area?: string | null
          city?: string | null
          district?: string | null
          latitude?: number | null
          longitude?: number | null
          google_maps_url?: string | null
          description?: string | null
          contact_person?: string | null
          contact_number?: string | null
          image_url?: string | null
          status?: string
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catering_jobs_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      job_confirmations: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          status: string
          confirmed_at: string
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          status?: string
          confirmed_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          status?: string
          confirmed_at?: string
          cancelled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_confirmations_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "catering_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_confirmations_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      worker_attendance: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          attendance_status: string
          arrival_time: string | null
          marked_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          attendance_status?: string
          arrival_time?: string | null
          marked_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          attendance_status?: string
          arrival_time?: string | null
          marked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_attendance_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "catering_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_attendance_marked_by_fkey"
            columns: ["marked_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      location_sharing_sessions: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          latitude: number | null
          longitude: number | null
          sharing_enabled: boolean
          started_at: string
          expires_at: string | null
          last_updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          latitude?: number | null
          longitude?: number | null
          sharing_enabled?: boolean
          started_at?: string
          expires_at?: string | null
          last_updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          latitude?: number | null
          longitude?: number | null
          sharing_enabled?: boolean
          started_at?: string
          expires_at?: string | null
          last_updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_sharing_sessions_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "catering_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_sharing_sessions_worker_id_fkey"
            columns: ["worker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      deleted_jobs: {
        Row: {
          id: string
          original_job_id: string | null
          provider_id: string
          deleted_by: string
          deleted_at: string
          expires_at: string | null
          deletion_reason: string | null
        }
        Insert: {
          id?: string
          original_job_id?: string | null
          provider_id: string
          deleted_by: string
          deleted_at?: string
          expires_at?: string | null
          deletion_reason?: string | null
        }
        Update: {
          id?: string
          original_job_id?: string | null
          provider_id?: string
          deleted_by?: string
          deleted_at?: string
          expires_at?: string | null
          deletion_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_jobs_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_jobs_deleted_by_fkey"
            columns: ["deleted_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          job_id: string
          reason: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          job_id: string
          reason: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          job_id?: string
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "catering_jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_type: string | null
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
