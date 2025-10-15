import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'field_worker'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  full_name?: string | null
  created_at: string
  updated_at: string
}

/**
 * Check if the current user is an admin
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Auth error in isAdmin:', userError)
    return false
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error in isAdmin:', profileError)
    console.error('User ID:', user.id)
    return false
  }

  console.log('isAdmin check - User ID:', user.id, 'Profile:', profile)
  return (profile as { role: UserRole } | null)?.role === 'admin'
}

/**
 * Get the current user's profile
 * @returns UserProfile or null
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as UserProfile | null
}

/**
 * Get the current user's role
 * @returns UserRole or null
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getUserProfile()
  return profile?.role || null
}
