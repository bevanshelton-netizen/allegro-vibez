import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('Profile load failed:', error.message)
      setProfile(null)
      return null
    }
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return
      if (error) console.error(error.message)
      const next = data?.session ?? null
      setSession(next)
      if (next?.user?.id) await loadProfile(next.user.id)
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next)
      if (next?.user?.id) await loadProfile(next.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(({ email, password, fullName, displayName, role = 'artist' }) => {
    if (!supabase) return Promise.resolve({ error: new Error('Supabase is not configured.') })
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: displayName || fullName,
          role,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    })
  }, [])

  const signIn = useCallback(({ email, password }) => {
    if (!supabase) return Promise.resolve({ error: new Error('Supabase is not configured.') })
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: null }
    const result = await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    return result
  }, [])

  const requestPasswordReset = useCallback((email) => {
    if (!supabase) return Promise.resolve({ error: new Error('Supabase is not configured.') })
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  }, [])

  const updatePassword = useCallback((password) => {
    if (!supabase) return Promise.resolve({ error: new Error('Supabase is not configured.') })
    return supabase.auth.updateUser({ password })
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session?.user?.id])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAuthenticated: Boolean(session?.user),
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
  }), [session, profile, loading, signUp, signIn, signOut, requestPasswordReset, updatePassword, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
