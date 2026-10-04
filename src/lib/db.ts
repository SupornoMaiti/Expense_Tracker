import { openDB } from 'idb'
import { getCurrentUserId } from './user-id'
import type { DBSchema, IDBPDatabase } from 'idb'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'refund'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category: string
  description: string
  created_at: string   // ISO string
  synced_at: string | null
  device_id: string
}

export interface Person {
  id: string
  user_id: string
  name: string
  phone: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  person_id: string
  transaction_id: string | null
  amount: number          // positive = they owe me, negative = I owe them
  category: string
  note: string
  settled: boolean
  created_at: string
  due_date?: string       // ISO date string — when they should repay
  remind_at?: string      // ISO string — last notification fired
  settle_tx_id?: string   // ID of the refund/expense transaction created upon settlement
}

// ─── Reminder helpers ────────────────────────────────────────────────────────

export interface DebtReminder {
  debt: Debt
  personName: string
  daysOverdue: number     // negative = upcoming, 0 = today, positive = overdue
}

export type OutboxOp = {
  id: string
  table: 'transactions' | 'people' | 'debts' | 'categories'
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Transaction | Person | Debt | Category
  created_at: string
}

// ─── DB Schema ───────────────────────────────────────────────────────────────

interface FinTrackDB extends DBSchema {
  transactions: {
    key: string
    value: Transaction
    indexes: { 'by-created': string; 'by-type': TransactionType }
  }
  people: {
    key: string
    value: Person
    indexes: { 'by-name': string }
  }
  debts: {
    key: string
    value: Debt
    indexes: { 'by-person': string; 'by-settled': string }
  }
  categories: {
    key: string
    value: Category
    indexes: { 'by-name': string }
  }
  outbox: {
    key: string
    value: OutboxOp
    indexes: { 'by-created': string }
  }
}

// ─── DB Instance ─────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<FinTrackDB>> | null = null

export function getDB(): Promise<IDBPDatabase<FinTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinTrackDB>('fintrack-db', 2, {
      upgrade(db) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
          txStore.createIndex('by-created', 'created_at')
          txStore.createIndex('by-type', 'type')
        }

        // People store
        if (!db.objectStoreNames.contains('people')) {
          const pplStore = db.createObjectStore('people', { keyPath: 'id' })
          pplStore.createIndex('by-name', 'name')
        }

        // Debts store
        if (!db.objectStoreNames.contains('debts')) {
          const debtStore = db.createObjectStore('debts', { keyPath: 'id' })
          debtStore.createIndex('by-person', 'person_id')
          debtStore.createIndex('by-settled', 'settled')
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' })
          catStore.createIndex('by-name', 'name')
        }

        // Outbox store (pending sync ops)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' })
          outboxStore.createIndex('by-created', 'created_at')
        }
      },
    })
  }
  return dbPromise
}

// Close the connection — must be called before indexedDB.deleteDatabase()
// otherwise the deletion is blocked by the open handle.
export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const DEVICE_ID = (() => {
  let id = localStorage.getItem('fintrack-device-id')
  if (!id) {
    id = uuid()
    localStorage.setItem('fintrack-device-id', id)
  }
  return id
})()

// user_id is resolved dynamically via auth.tsx getCurrentUserId()

// ─── Transactions CRUD ───────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAllFromIndex('transactions', 'by-created')
  return all.filter(tx => tx.user_id === uid).reverse()
}

export async function addTransaction(
  data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'synced_at' | 'device_id'>
): Promise<Transaction> {
  const db = await getDB()
  const tx: Transaction = {
    ...data,
    id: uuid(),
    user_id: getCurrentUserId(),
    created_at: now(),
    synced_at: null,
    device_id: DEVICE_ID,
  }
  await db.put('transactions', tx)
  await enqueueOutbox('transactions', 'INSERT', tx)
  window.dispatchEvent(new CustomEvent('transactions-updated'))
  return tx
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  const tx = await db.get('transactions', id)
  if (!tx) return

  // Cascading deletes/updates for debts
  const allDebts = await db.getAll('debts')

  // 1. If this is a parent transaction (e.g. split expense), delete linked debts
  const linkedDebts = allDebts.filter(d => d.transaction_id === id)
  for (const debt of linkedDebts) {
    if (debt.settle_tx_id) {
      const sTx = await db.get('transactions', debt.settle_tx_id)
      if (sTx) {
        await db.delete('transactions', debt.settle_tx_id)
        await enqueueOutbox('transactions', 'DELETE', sTx)
      }
    }
    await db.delete('debts', debt.id)
    await enqueueOutbox('debts', 'DELETE', debt)
  }

  // 2. If this is a settlement transaction (e.g. refund), unsettle the linked debt
  const settledDebts = allDebts.filter(d => d.settle_tx_id === id)
  for (const debt of settledDebts) {
    const updated = { ...debt, settled: false }
    delete updated.settle_tx_id
    await db.put('debts', updated)
    await enqueueOutbox('debts', 'UPDATE', updated)
  }

  await db.delete('transactions', id)
  await enqueueOutbox('transactions', 'DELETE', tx)
  window.dispatchEvent(new CustomEvent('transactions-updated'))
}

export async function getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAllFromIndex('transactions', 'by-type', type)
  return all.filter(tx => tx.user_id === uid)
}

// ─── People CRUD ─────────────────────────────────────────────────────────────

export async function getAllPeople(): Promise<Person[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAllFromIndex('people', 'by-name')
  return all.filter(p => p.user_id === uid)
}

export async function addPerson(data: Omit<Person, 'id' | 'user_id' | 'created_at'>): Promise<Person> {
  const db = await getDB()
  const person: Person = {
    ...data,
    id: uuid(),
    user_id: getCurrentUserId(),
    created_at: now(),
  }
  await db.put('people', person)
  await enqueueOutbox('people', 'INSERT', person)
  return person
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDB()
  const person = await db.get('people', id)
  if (!person) return
  // Also delete linked debts
  const debts = await db.getAllFromIndex('debts', 'by-person', id)
  for (const debt of debts) {
    await db.delete('debts', debt.id)
  }
  await db.delete('people', id)
  await enqueueOutbox('people', 'DELETE', person)
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const db = await getDB()
  return db.get('people', id)
}

// ─── Categories CRUD ─────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAllFromIndex('categories', 'by-name')
  return all.filter(c => c.user_id === uid)
}

export async function addCategory(
  data: Omit<Category, 'id' | 'user_id' | 'created_at'>
): Promise<Category> {
  const db = await getDB()
  const cat: Category = {
    ...data,
    id: uuid(),
    user_id: getCurrentUserId(),
    created_at: now(),
  }
  await db.put('categories', cat)
  await enqueueOutbox('categories', 'INSERT', cat)
  return cat
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  const cat = await db.get('categories', id)
  if (!cat) return
  await db.delete('categories', id)
  await enqueueOutbox('categories', 'DELETE', cat)
}

// ─── Debts CRUD ──────────────────────────────────────────────────────────────

export async function getAllDebts(): Promise<Debt[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAll('debts')
  return all.filter(d => d.user_id === uid)
}

export async function getDebtsByPerson(personId: string): Promise<Debt[]> {
  const db  = await getDB()
  const uid = getCurrentUserId()
  const all = await db.getAllFromIndex('debts', 'by-person', personId)
  return all.filter(d => d.user_id === uid)
}

export async function addDebt(
  data: Omit<Debt, 'id' | 'user_id' | 'created_at'>
): Promise<Debt> {
  const db = await getDB()
  const debt: Debt = {
    ...data,
    id: uuid(),
    user_id: getCurrentUserId(),
    created_at: now(),
  }
  await db.put('debts', debt)
  await enqueueOutbox('debts', 'INSERT', debt)

  // ── Accounting side-effect ────────────────────────────────────────────────
  // amount > 0 (they owe me) with no linked transaction
  //   → record an EXPENSE now (money already left my pocket)
  // amount > 0 with linked transaction_id (split expense)
  //   → do not add another expense, it's already counted in the original expense
  // amount < 0 (I owe them) → I haven't paid yet, just a future obligation
  //   → no transaction now; expense is recorded when the debt is settled
  if (debt.amount > 0 && !debt.transaction_id) {
    const person = await db.get('people', debt.person_id)
    const pName  = person ? person.name : 'friend'

    const tx: Transaction = {
      id:          uuid(),
      user_id:     getCurrentUserId(),
      type:        'expense',
      amount:      Math.abs(debt.amount),
      category:    debt.category || 'other',
      description: `Paid for ${pName} – ${debt.note || 'debt'}`,
      created_at:  debt.created_at,
      synced_at:   null,
      device_id:   DEVICE_ID,
    }
    debt.transaction_id = tx.id
    await db.put('debts', debt)          // update with linked tx id
    await db.put('transactions', tx)
    await enqueueOutbox('transactions', 'INSERT', tx)
    window.dispatchEvent(new CustomEvent('transactions-updated'))
  }

  return debt
}

export async function settleDebt(id: string): Promise<void> {
  const db = await getDB()
  const debt = await db.get('debts', id)
  if (!debt || debt.settled) return

  const person = await db.get('people', debt.person_id)
  const pName  = person ? person.name : 'friend'

  const tx: Transaction = {
    id:          uuid(),
    user_id:     getCurrentUserId(),
    type:        debt.amount > 0 ? 'refund' : 'expense',
    amount:      Math.abs(debt.amount),
    category:    debt.category || 'other',
    description: debt.amount > 0
      ? `${pName} paid back – ${debt.note || 'settled'}`
      : `Paid to ${pName} – ${debt.note || 'settled'}`,
    created_at:  now(),
    synced_at:   null,
    device_id:   DEVICE_ID,
  }

  // Mark the debt settled (moved down to include settle_tx_id)
  const updated = { ...debt, settled: true, settle_tx_id: tx.id }
  await db.put('debts', updated)
  await enqueueOutbox('debts', 'UPDATE', updated)

  await db.put('transactions', tx)
  await enqueueOutbox('transactions', 'INSERT', tx)
  window.dispatchEvent(new CustomEvent('transactions-updated'))
}

// Settle every unsettled debt for a given person at once
export async function settleAllDebts(personId: string): Promise<void> {
  const db    = await getDB()
  const debts = await db.getAllFromIndex('debts', 'by-person', personId)
  const unsettled = debts.filter(d => !d.settled)
  for (const d of unsettled) {
    await settleDebt(d.id)
  }
}

export async function deleteDebt(id: string): Promise<void> {
  const db = await getDB()
  const debt = await db.get('debts', id)
  if (!debt) return
  await db.delete('debts', id)
  await enqueueOutbox('debts', 'DELETE', debt)
}

// ─── Outbox ──────────────────────────────────────────────────────────────────

export async function enqueueOutbox(
  table: OutboxOp['table'],
  operation: OutboxOp['operation'],
  payload: Transaction | Person | Debt | Category
): Promise<void> {
  const db = await getDB()
  const op: OutboxOp = {
    id: uuid(),
    table,
    operation,
    payload,
    created_at: now(),
  }
  await db.put('outbox', op)
}

export async function getPendingOutboxCount(): Promise<number> {
  const db = await getDB()
  return db.count('outbox')
}

export async function getAllOutbox(): Promise<OutboxOp[]> {
  const db = await getDB()
  return db.getAllFromIndex('outbox', 'by-created')
}

export async function removeFromOutbox(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('outbox', id)
}
