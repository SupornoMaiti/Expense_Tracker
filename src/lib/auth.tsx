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
    // Also wipe Supabase auth tokens manually. If signOut() timed out due to 
    // network issues, it leaves the token in localStorage. The next page load 
    // will hang trying to refresh it. This guarantees a clean local state.
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
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

    // ── Restore existing session ─────────────────────────────────────────────
    // Timeout guard: if Supabase doesn't respond quickly, unblock the app.
    // 2.5s is enough for a local token check. But if this is an OAuth redirect,
    // Supabase needs to verify the token with the server, so give it 10s.
    const isOAuthRedirect = window.location.hash.includes('access_token=')
    const timeoutId = setTimeout(() => {
      console.warn('[auth] getSession timed out — running unauthenticated')
      setCurrentUserId('local-user')
      setLoading(false)
    }, isOAuthRedirect ? 10000 : 2500)

    if (!supabase) {
      clearTimeout(timeoutId)
      setCurrentUserId('local-user')
      setLoading(false)
      return
    }

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeoutId)

        const incomingId = session?.user?.id ?? 'local-user'
        const lastId     = localStorage.getItem(LAST_USER_KEY) ?? 'local-user'

        // If the user changed (or first real login after anonymous use) wipe
        // stale IndexedDB data so the pull starts from a clean slate.
        if (session && incomingId !== lastId) {
          console.info('[auth] user changed — wiping local cache')
          await wipeLocalData()
          localStorage.setItem(LAST_USER_KEY, incomingId)
          window.location.reload() // Force clean slate to avoid IDB connection race conditions
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
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        console.error('[auth] getSession error:', err)
        setCurrentUserId('local-user')
        setLoading(false)
      })

    // ── Listen for future auth events ────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Prevent race conditions: if onAuthStateChange fires before getSession
        // during an OAuth login, it must enforce the wipe-and-reload guard.
        if (event === 'SIGNED_IN' && session) {
          const incomingId = session.user.id
          const lastId     = localStorage.getItem(LAST_USER_KEY) ?? 'local-user'
          if (incomingId !== lastId) {
            console.info('[auth] user changed (OAuth) — wiping local cache')
            await wipeLocalData()
            localStorage.setItem(LAST_USER_KEY, incomingId)
            window.location.reload()
            return
          }
        }

        setSession(session)
        setUser(session?.user ?? null)
        setCurrentUserId(session?.user?.id ?? 'local-user')

        if (event === 'SIGNED_IN' && session) {
          await pullFromSupabase()
          if (unsubscribeRealtime) unsubscribeRealtime()
          unsubscribeRealtime = subscribeToRealtime()
        }

        if (event === 'SIGNED_OUT') {
          if (unsubscribeRealtime) {
            unsubscribeRealtime()
            unsubscribeRealtime = null
          }
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
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

    // 2. Wipe all local data regardless of network result
    await wipeLocalData()

    // 3. Force a full page reload — this closes all IDB connections cleanly,
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
