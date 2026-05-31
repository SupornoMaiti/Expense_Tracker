import { useState, type FormEvent } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './Login.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMode = 'signin' | 'register'

// ─── Google SVG icon (inline — no CDN dependency) ────────────────────────────

function GoogleIcon() {
  return (
    <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const [mode, setMode]         = useState<AuthMode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [info, setInfo]         = useState<string | null>(null)

  // ── Guard: Supabase not configured ──────────────────────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <span className="login-brand__icon">₹</span>
            <div className="login-brand__name">FINTRACK</div>
          </div>
          <div className="login-error">
            <span className="login-error-prefix">ERR</span>
            Supabase is not configured. Add{' '}
            <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env.local</code> file.
          </div>
        </div>
      </div>
    )
  }

  // ── Email / Password submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Auth state change in AuthProvider handles the redirect
      } else {
        const { error } = await supabase!.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Account created! Check your email to confirm your address, then sign in.')
        setMode('signin')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const { error } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed'
      // Surface a friendly message if Google isn't configured yet
      if (msg.toLowerCase().includes('provider') || msg.toLowerCase().includes('disabled')) {
        setError('Google OAuth not yet configured in Supabase dashboard. Use email/password for now.')
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  // ── Switch mode — reset state ────────────────────────────────────────────────
  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── Brand ───────────────────────────────────────────────────────── */}
        <div className="login-brand">
          <span className="login-brand__icon">₹</span>
          <div className="login-brand__name">FINTRACK</div>
          <div className="login-brand__tagline">
            personal finance terminal<span className="login-cursor" />
          </div>
        </div>

        {/* ── Mode tabs ───────────────────────────────────────────────────── */}
        <div className="login-tabs" role="tablist">
          <button
            id="tab-signin"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`login-tab ${mode === 'signin' ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            role="tab"
            aria-selected={mode === 'register'}
            className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {/* ── Info banner ─────────────────────────────────────────────────── */}
        {info && (
          <div className="login-info" role="status">
            {info}
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="login-error" role="alert">
            <span className="login-error-prefix">ERR &gt;</span>
            {error}
          </div>
        )}

        {/* ── Email / Password form ────────────────────────────────────────── */}
        <form
          id="login-form"
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby={`tab-${mode}`}
        >
          <div>
            <label htmlFor="login-email" className="login-label">
              <span>›</span> Email
            </label>
            <input
              id="login-email"
              type="email"
              className={`login-input${error ? ' login-input--error' : ''}`}
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="login-label">
              <span>›</span> Password
            </label>
            <input
              id="login-password"
              type="password"
              className={`login-input${error ? ' login-input--error' : ''}`}
              placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="login-submit"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <><div className="login-spinner" aria-hidden="true" /> Processing...</>
            ) : mode === 'signin' ? (
              '› Sign In'
            ) : (
              '› Create Account'
            )}
          </button>
        </form>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="login-divider">
          <span>or continue with</span>
        </div>

        {/* ── Google OAuth ────────────────────────────────────────────────── */}
        <button
          id="login-google-btn"
          type="button"
          className="login-google"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Google
        </button>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="login-footer">
          FINTRACK v2.0 · offline-first PWA
        </div>

      </div>
    </div>
  )
}
