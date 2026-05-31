import {
  getAllOutbox,
  removeFromOutbox,
  getPendingOutboxCount,
  getDB,
} from './db'
import type { OutboxOp, Transaction, Person, Debt, Category } from './db'
import { supabase, isSupabaseConfigured } from './supabase'
import { getCurrentUserId } from './user-id'

// ─── Sync Engine ─────────────────────────────────────────────────────────────
// Drains the IndexedDB outbox and pushes to Supabase when online.
// Called on app startup and whenever connectivity is restored.

export async function pushOutbox(): Promise<{ pushed: number; errors: number }> {
  if (!isSupabaseConfigured || !supabase) return { pushed: 0, errors: 0 }
  if (!navigator.onLine) return { pushed: 0, errors: 0 }

  // Auth guard: do not sync if no active session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { pushed: 0, errors: 0 }

  // Use session.user.id directly instead of getCurrentUserId() because SyncStatusBar
  // might call this before auth.tsx has finished updating the global user_id state.
  const uid = session.user.id
  const ops = await getAllOutbox()
  let pushed = 0
  let errors = 0

  for (const op of ops) {
    // Purge entries created before auth was set up (user_id = 'local-user'
    // or a different user's UUID). These can never pass RLS and would retry forever.
    const payloadUserId = (op.payload as { user_id?: string }).user_id
    if (payloadUserId && payloadUserId !== uid) {
      console.info('[sync] purging stale outbox entry', op.id, 'uid:', payloadUserId)
      await removeFromOutbox(op.id)
      continue
    }

    try {
      await executeOp(op)
      await removeFromOutbox(op.id)
      pushed++
    } catch (err: any) {
      console.warn('[sync] Failed op', op.id, err)
      
      // If the error object has a 'code' property, it is a Supabase PostgrestError.
      // This means the server actively rejected the data (e.g. invalid UUID format, 
      // RLS policy denial, schema mismatch). Retrying will never succeed, so we 
      // MUST discard the operation to prevent an infinite syncing loop.
      if (err && typeof err.code === 'string') {
        console.warn('[sync] Permanent server error detected. Discarding stale op:', op.id)
        await removeFromOutbox(op.id)
      } else {
        // Network errors or other transient issues will retry on the next tick
        errors++
      }
    }
  }

  return { pushed, errors }
}

async function executeOp(op: OutboxOp): Promise<void> {
  if (!supabase) return

  if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
    const { error } = await supabase.from(op.table).upsert(op.payload as never)
    if (error) throw error
  } else if (op.operation === 'DELETE') {
    const { error } = await supabase.from(op.table).delete().eq('id', (op.payload as { id: string }).id)
    if (error) throw error
  }
}

// ─── Pull from Supabase → IndexedDB ──────────────────────────────────────────
// Called on sign-in and on app startup when a session is already active.
// This is what makes cross-device sync work — remote data is loaded into
// local IndexedDB so the app works offline after the first sync.

export async function pullFromSupabase(): Promise<{ pulled: number }> {
  if (!isSupabaseConfigured || !supabase) return { pulled: 0 }
  if (!navigator.onLine) return { pulled: 0 }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { pulled: 0 }

  const db = await getDB()
  let pulled = 0

  try {
    // ── Transactions ────────────────────────────────────────────────────────
    const { data: transactions, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (txErr) {
      console.warn('[sync/pull] transactions:', txErr.message)
    } else if (transactions) {
      for (const row of transactions) {
        await db.put('transactions', row as Transaction)
        pulled++
      }
    }

    // ── People ──────────────────────────────────────────────────────────────
    const { data: people, error: pplErr } = await supabase
      .from('people')
      .select('*')
      .order('name')
    if (pplErr) {
      console.warn('[sync/pull] people:', pplErr.message)
    } else if (people) {
      for (const row of people) {
        await db.put('people', row as Person)
        pulled++
      }
    }

    // ── Debts ───────────────────────────────────────────────────────────────
    const { data: debts, error: debtErr } = await supabase
      .from('debts')
      .select('*')
    if (debtErr) {
      console.warn('[sync/pull] debts:', debtErr.message)
    } else if (debts) {
      for (const row of debts) {
        // Postgres returns boolean as-is; normalize just in case
        await db.put('debts', { ...row, settled: Boolean(row.settled) } as Debt)
        pulled++
      }
    }

    // ── Categories ──────────────────────────────────────────────────────────
    const { data: categories, error: catErr } = await supabase
      .from('categories')
      .select('*')
    if (catErr) {
      console.warn('[sync/pull] categories:', catErr.message)
    } else if (categories) {
      for (const row of categories) {
        await db.put('categories', row as Category)
        pulled++
      }
    }

    // Notify all listening components to re-render with fresh data
    if (pulled > 0) {
      window.dispatchEvent(new CustomEvent('transactions-updated'))
      window.dispatchEvent(new CustomEvent('people-updated'))
      window.dispatchEvent(new CustomEvent('debts-updated'))
      window.dispatchEvent(new CustomEvent('categories-updated'))
    }

    console.info(`[sync/pull] pulled ${pulled} records from Supabase`)
  } catch (err) {
    console.warn('[sync/pull] unexpected error:', err)
  }

  return { pulled }
}

// ─── Realtime subscription ────────────────────────────────────────────────────
// Subscribe to Supabase Realtime so changes pushed from another device
// appear instantly without a manual refresh.

export function subscribeToRealtime(): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {}

  const uid = getCurrentUserId()

  // Use a unique channel name so rapid re-renders (like React StrictMode)
  // or quick sign in/out don't try to reuse a channel that is already subscribed.
  const channel = supabase
    .channel(`fintrack-realtime-${uid}-${Date.now()}`)

    // ── Transactions ──────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${uid}` },
      async (payload) => {
        const db = await getDB()
        if (payload.eventType === 'DELETE') {
          await db.delete('transactions', (payload.old as { id: string }).id)
        } else {
          await db.put('transactions', payload.new as Transaction)
        }
        window.dispatchEvent(new CustomEvent('transactions-updated'))
      }
    )

    // ── People ────────────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'people', filter: `user_id=eq.${uid}` },
      async (payload) => {
        const db = await getDB()
        if (payload.eventType === 'DELETE') {
          await db.delete('people', (payload.old as { id: string }).id)
        } else {
          await db.put('people', payload.new as Person)
        }
        window.dispatchEvent(new CustomEvent('people-updated'))
      }
    )

    // ── Debts ─────────────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${uid}` },
      async (payload) => {
        const db = await getDB()
        if (payload.eventType === 'DELETE') {
          await db.delete('debts', (payload.old as { id: string }).id)
        } else {
          const row = payload.new as Debt
          await db.put('debts', { ...row, settled: Boolean(row.settled) })
        }
        window.dispatchEvent(new CustomEvent('debts-updated'))
      }
    )

    // ── Categories ────────────────────────────────────────────────────────
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${uid}` },
      async (payload) => {
        const db = await getDB()
        if (payload.eventType === 'DELETE') {
          await db.delete('categories', (payload.old as { id: string }).id)
        } else {
          await db.put('categories', payload.new as Category)
        }
        window.dispatchEvent(new CustomEvent('categories-updated'))
      }
    )

    .subscribe((status) => {
      console.info('[sync/realtime] status:', status)
    })

  // Return an unsubscribe function — call this on sign-out or unmount
  return () => {
    supabase!.removeChannel(channel)
  }
}

// ─── Background Sync Registration ────────────────────────────────────────────

export async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return
  try {
    const registration = await navigator.serviceWorker.ready
    // @ts-expect-error - SyncManager types not fully in TS lib
    await registration.sync.register('fintrack-sync')
  } catch (err) {
    console.warn('[sync] Background sync registration failed:', err)
  }
}

// ─── Pending count ───────────────────────────────────────────────────────────

export { getPendingOutboxCount }
