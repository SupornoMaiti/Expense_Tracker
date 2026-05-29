import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense'

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

export interface Debt {
  id: string
  user_id: string
  person_id: string
  transaction_id: string | null
  amount: number          // positive = they owe me, negative = I owe them
  note: string
  settled: boolean
  created_at: string
  due_date?: string       // ISO date string — when they should repay
  remind_at?: string      // ISO string — last notification fired
}

// ─── Reminder helpers ────────────────────────────────────────────────────────

export interface DebtReminder {
  debt: Debt
  personName: string
  daysOverdue: number     // negative = upcoming, 0 = today, positive = overdue
}

export type OutboxOp = {
  id: string
  table: 'transactions' | 'people' | 'debts'
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Transaction | Person | Debt
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
    dbPromise = openDB<FinTrackDB>('fintrack-db', 1, {
      upgrade(db) {
        // Transactions store
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
        txStore.createIndex('by-created', 'created_at')
        txStore.createIndex('by-type', 'type')

        // People store
        const pplStore = db.createObjectStore('people', { keyPath: 'id' })
        pplStore.createIndex('by-name', 'name')

        // Debts store
        const debtStore = db.createObjectStore('debts', { keyPath: 'id' })
        debtStore.createIndex('by-person', 'person_id')
        debtStore.createIndex('by-settled', 'settled')

        // Outbox store (pending sync ops)
        const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' })
        outboxStore.createIndex('by-created', 'created_at')
      },
    })
  }
  return dbPromise
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

const USER_ID = 'local-user' // replaced by Supabase auth in Phase 1c

// ─── Transactions CRUD ───────────────────────────────────────────────────────

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('transactions', 'by-created')
  return all.reverse()
}

export async function addTransaction(
  data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'synced_at' | 'device_id'>
): Promise<Transaction> {
  const db = await getDB()
  const tx: Transaction = {
    ...data,
    id: uuid(),
    user_id: USER_ID,
    created_at: now(),
    synced_at: null,
    device_id: DEVICE_ID,
  }
  await db.put('transactions', tx)
  await enqueueOutbox('transactions', 'INSERT', tx)
  return tx
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  const tx = await db.get('transactions', id)
  if (!tx) return
  await db.delete('transactions', id)
  await enqueueOutbox('transactions', 'DELETE', tx)
}

export async function getTransactionsByType(type: TransactionType): Promise<Transaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-type', type)
}

// ─── People CRUD ─────────────────────────────────────────────────────────────

export async function getAllPeople(): Promise<Person[]> {
  const db = await getDB()
  return db.getAllFromIndex('people', 'by-name')
}

export async function addPerson(data: Omit<Person, 'id' | 'user_id' | 'created_at'>): Promise<Person> {
  const db = await getDB()
  const person: Person = {
    ...data,
    id: uuid(),
    user_id: USER_ID,
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

// ─── Debts CRUD ──────────────────────────────────────────────────────────────

export async function getAllDebts(): Promise<Debt[]> {
  const db = await getDB()
  return db.getAll('debts')
}

export async function getDebtsByPerson(personId: string): Promise<Debt[]> {
  const db = await getDB()
  return db.getAllFromIndex('debts', 'by-person', personId)
}

export async function addDebt(
  data: Omit<Debt, 'id' | 'user_id' | 'created_at'>
): Promise<Debt> {
  const db = await getDB()
  const debt: Debt = {
    ...data,
    id: uuid(),
    user_id: USER_ID,
    created_at: now(),
  }
  await db.put('debts', debt)
  await enqueueOutbox('debts', 'INSERT', debt)
  return debt
}

export async function settleDebt(id: string): Promise<void> {
  const db = await getDB()
  const debt = await db.get('debts', id)
  if (!debt) return
  const updated = { ...debt, settled: true }
  await db.put('debts', updated)
  await enqueueOutbox('debts', 'UPDATE', updated)
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
  payload: Transaction | Person | Debt
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
