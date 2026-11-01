import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile, UserRole, createProfile, updateProfile as dbUpdateProfile } from '@/lib/database'

// ============================================================================
// Types
// ============================================================================

export interface SignUpData {
  email: string
  password: string
  fullName: string
  phoneNumber?: string
  role: 'worker' | 'provider'
}

export interface AuthResult {
  success: boolean
  error?: string
}

export interface ProfileUpdate {
  full_name?: string
  phone_number?: string | null
  preferred_language?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  isAuthenticated: boolean
  signUp: (data: SignUpData) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  updateProfile: (updates: ProfileUpdate) => Promise<AuthResult>
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)
  const loadingProfileRef = useRef(false)
  const initialSessionProcessed = useRef(false)

  // Derive role from profile
  const role = profile?.role as UserRole | null
  const isAuthenticated = !!user && !!profile

  // Load profile from database
  const loadProfile = async (userId: string) => {
    if (loadingProfileRef.current) return // Prevent duplicate requests
    loadingProfileRef.current = true

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!isMounted.current) return

      if (error) {
        console.error('Error loading profile:', error)
        // If profile doesn't exist, sign out the user
        if (error.code === 'PGRST116') {
          console.warn('Profile not found, signing out user')
          await supabase.auth.signOut()
          // Check if still mounted before updating state
          if (!isMounted.current) return
          setUser(null)
          setProfile(null)
        }
        return
      }

      setProfile(data)
    } finally {
      if (isMounted.current) {
        loadingProfileRef.current = false
      }
    }
  }

  // Auth state listener
  useEffect(() => {
    isMounted.current = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted.current) return

      initialSessionProcessed.current = true
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id).finally(() => {
          if (isMounted.current) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        } else if (event === 'INITIAL_SESSION') {
          // Skip if we already processed the initial session via getSession()
          if (initialSessionProcessed.current) {
            setLoading(false)
            return
          }
          if (session?.user) {
            setUser(session.user)
            await loadProfile(session.user.id)
          }
          setLoading(false)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      isMounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign up
  const signUp = async (data: SignUpData): Promise<AuthResult> => {
    try {
      // Never allow admin role
      if (data.role !== 'worker' && data.role !== 'provider') {
        return { success: false, error: 'Invalid role selected' }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' }
      }

      // Create profile
      const profileData = await createProfile({
        id: authData.user.id,
        full_name: data.fullName,
        phone_number: data.phoneNumber || null,
        role: data.role,
      })

      if (!profileData) {
        // Profile creation failed, sign out the user
        await supabase.auth.signOut()
        return { success: false, error: 'Failed to create profile. Please try again.' }
      }

      // If email confirmation is required, user needs to check email
      if (authData.user.identities?.length === 0) {
        return {
          success: true,
          error: 'Please check your email to confirm your account',
        }
      }

      // Update local state
      setUser(authData.user)
      setProfile(profileData)

      return { success: true }
    } catch (err) {
      console.error('Signup error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Sign in
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' }
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Please confirm your email address first' }
        }
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to sign in' }
      }

      // Profile will be loaded by onAuthStateChange listener
      return { success: true }
    } catch (err) {
      console.error('Sign in error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  // Update profile
  const updateProfile = async (updates: ProfileUpdate): Promise<AuthResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const updatedProfile = await dbUpdateProfile(user.id, updates)

      if (!updatedProfile) {
        return { success: false, error: 'Failed to update profile' }
      }

      setProfile(updatedProfile)
      return { success: true }
    } catch (err) {
      console.error('Update profile error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    role,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
