import {
  getAllOutbox,
  removeFromOutbox,
  getPendingOutboxCount,
} from './db'
import type { OutboxOp } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

// ─── Sync Engine ─────────────────────────────────────────────────────────────
// Drains the IndexedDB outbox and pushes to Supabase when online.
// Called on app startup and whenever connectivity is restored.

export async function pushOutbox(): Promise<{ pushed: number; errors: number }> {
  if (!isSupabaseConfigured || !supabase) return { pushed: 0, errors: 0 }
  if (!navigator.onLine) return { pushed: 0, errors: 0 }

  const ops = await getAllOutbox()
  let pushed = 0
  let errors = 0

  for (const op of ops) {
    try {
      await executeOp(op)
      await removeFromOutbox(op.id)
      pushed++
    } catch (err) {
      console.warn('[sync] Failed op', op.id, err)
      errors++
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
