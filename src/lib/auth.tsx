// ─── Auth Context ─────────────────────────────────────────────────────────────
// Wraps Supabase auth session and exposes it app-wide via React context.
// Uses user-id.ts to share the current user ID with db.ts without a circular
// module dependency.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import { setCurrentUserId } from './user-id'
import { closeDB } from './db'
import { pullFromSupabase, subscribeToRealtime } from './sync'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  session: Session | null
  /** True while the initial session check is in-flight */
  loading: boolean
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

// ─── IndexedDB wipe ───────────────────────────────────────────────────────────
// Called on sign-out. Deletes the entire 'fintrack-db' so no cached data
// leaks to a subsequent user on the same device.

async function wipeLocalData(): Promise<void> {
  try {
    // Close the open IDB handle first — otherwise deleteDatabase fires
    // 'onblocked' and the deletion never completes, breaking sign-out.
    await closeDB()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('fintrack-db')
      req.onsuccess = () => resolve()
      req.onerror   = () => reject(req.error)
      req.onblocked = () => resolve() // fallback
    })
    localStorage.removeItem('fintrack-device-id')
    localStorage.removeItem('fintrack-last-user')
  } catch (err) {
    console.warn('[auth] IndexedDB wipe failed:', err)
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCurrentUserId('local-user')
      setLoading(false)
      return
    }

    let unsubscribeRealtime: (() => void) | null = null
    const LAST_USER_KEY = 'fintrack-last-user'

    // ── Single source of truth: onAuthStateChange ────────────────────────────
    // Supabase fires INITIAL_SESSION exactly once when it has resolved the
    // persisted session from localStorage (or determined there is none).
    // This is immune to React 18 StrictMode double-invoke because Supabase's
    // internal client deduplicates the event — we never need a custom timeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'INITIAL_SESSION') {
          // ── First boot: restore session ─────────────────────────────────
          const incomingId = session?.user?.id ?? 'local-user'
          const lastId     = localStorage.getItem(LAST_USER_KEY) ?? 'local-user'

          if (session && incomingId !== lastId) {
            // User changed — wipe stale IndexedDB then reload clean
            console.info('[auth] user changed — wiping local cache')
            await wipeLocalData()
            localStorage.setItem(LAST_USER_KEY, incomingId)
            setTimeout(() => window.location.reload(), 50)
            return
          }

          setSession(session)
          setUser(session?.user ?? null)
          setCurrentUserId(incomingId)
          setLoading(false)

          if (session) {
            await pullFromSupabase()
            unsubscribeRealtime = subscribeToRealtime()
          }
          return
        }

        if (event === 'SIGNED_IN' && session) {
          const incomingId = session.user.id
          const lastId     = localStorage.getItem(LAST_USER_KEY) ?? 'local-user'
          if (incomingId !== lastId) {
            console.info('[auth] user changed (sign-in) — wiping local cache')
            await wipeLocalData()
            localStorage.setItem(LAST_USER_KEY, incomingId)
            setTimeout(() => window.location.reload(), 50)
            return
          }

          setSession(session)
          setUser(session.user)
          setCurrentUserId(incomingId)
          if (unsubscribeRealtime) unsubscribeRealtime()
          unsubscribeRealtime = subscribeToRealtime()
          return
        }

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setCurrentUserId('local-user')
          if (unsubscribeRealtime) {
            unsubscribeRealtime()
            unsubscribeRealtime = null
          }
          return
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session)
          return
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (unsubscribeRealtime) unsubscribeRealtime()
    }
  }, [])

  const signOut = async () => {
    // 1. Sign out from Supabase — with a 5 s timeout so a network glitch
    //    can't leave the button stuck forever.
    try {
      if (supabase) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('signOut timeout')), 5000)
          ),
        ])
      }
    } catch (err) {
      console.warn('[auth] signOut error (continuing anyway):', err)
    }

    // 2. Wipe Supabase auth tokens manually in case signOut() timed out
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    })

    // 3. Wipe all local data regardless of network result
    await wipeLocalData()

    // 4. Force a full page reload — this closes all IDB connections cleanly,
    //    clears in-memory React state, and resets any SW-cached code.
    //    The app will reload with no session → shows Login page.
    window.location.href = window.location.origin
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
