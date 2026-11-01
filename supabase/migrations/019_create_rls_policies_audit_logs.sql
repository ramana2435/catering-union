-- =====================================================
-- Migration: 019_create_rls_policies_audit_logs.sql
-- Description: Row Level Security policies for admin_audit_logs table
-- IMMUTABLE: Audit logs cannot be updated or deleted
-- =====================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "audit_logs_select_admin" ON admin_audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON admin_audit_logs;

-- =====================================================
-- SELECT POLICIES
-- =====================================================

-- Policy 1: Only admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- INSERT POLICIES
-- =====================================================

-- Policy 2: Admins can insert audit logs via log_admin_action() function
-- The function is SECURITY DEFINER and sets admin_id = auth.uid()
CREATE POLICY "audit_logs_insert_admin" ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- NO UPDATE POLICIES - IMMUTABLE AUDIT TRAIL
-- =====================================================
-- Audit logs must never be modified after creation
-- This ensures complete accountability and prevents tampering

-- =====================================================
-- NO DELETE POLICIES - IMMUTABLE AUDIT TRAIL
-- =====================================================
-- Audit logs must never be deleted
-- Even if an admin account is compromised, the audit trail remains
-- For compliance and forensic purposes, all actions are permanently recorded

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Only INSERT and SELECT policies exist for this table
-- 2. No UPDATE policy = nobody can modify audit logs
-- 3. No DELETE policy = nobody can delete audit logs
-- 4. admin_id uses ON DELETE SET NULL to preserve logs even if admin deleted
-- 5. Use log_admin_action() function for consistent audit logging
-- 6. details JSONB field can store arbitrary context about the action
-- 7. target_type and target_id provide structured references
