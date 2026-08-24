import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

type AAL = 'aal1' | 'aal2' | null

type AuthContextValue = {
  user: User | null
  session: Session | null
  hasModeratorRole: boolean
  isModerator: boolean
  aal: AAL
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSecurity: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function checkModeratorRole(user: User | null): Promise<boolean> {
  if (!user || !supabase) return false
  const { data, error } = await supabase.rpc('has_moderator_role')
  if (error) {
    console.error('No se pudo comprobar el rol de moderador:', error)
    return false
  }
  return data === true
}

async function readAal(user: User | null): Promise<AAL> {
  if (!user || !supabase) return null
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) {
    console.error('No se pudo comprobar MFA:', error)
    return 'aal1'
  }
  return (data.currentLevel as AAL) ?? 'aal1'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [hasModeratorRole, setHasModeratorRole] = useState(false)
  const [aal, setAal] = useState<AAL>(null)
  const [loading, setLoading] = useState(true)

  const updateSecurity = useCallback(async (nextSession?: Session | null) => {
    setLoading(true)
    if (!supabase) {
      setSession(null)
      setHasModeratorRole(false)
      setAal(null)
      setLoading(false)
      return
    }

    let resolvedSession = nextSession
    if (resolvedSession === undefined) {
      const { data } = await supabase.auth.getSession()
      resolvedSession = data.session
    }

    const user = resolvedSession?.user ?? null
    setSession(resolvedSession ?? null)

    if (!user) {
      setHasModeratorRole(false)
      setAal(null)
      setLoading(false)
      return
    }

    const [role, assuranceLevel] = await Promise.all([
      checkModeratorRole(user),
      readAal(user),
    ])

    setHasModeratorRole(role)
    setAal(assuranceLevel)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) void updateSecurity(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queueMicrotask(() => {
        if (active) void updateSecurity(nextSession)
      })
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [updateSecurity])

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    hasModeratorRole,
    isModerator: hasModeratorRole && aal === 'aal2',
    aal,
    loading,
    async signIn(email, password) {
      if (!isSupabaseConfigured || !supabase) throw new Error('Primero configura Supabase.')
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw new Error('No se pudo iniciar sesión. Revisa tus credenciales.')
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
    async refreshSecurity() {
      setLoading(true)
      await updateSecurity()
    },
  }), [session, hasModeratorRole, aal, loading, updateSecurity])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
