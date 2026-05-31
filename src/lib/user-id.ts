// ─── Current User ID ─────────────────────────────────────────────────────────
// A tiny shared module that breaks the circular dependency between:
//   auth.tsx  → sync.ts → db.ts → (was: auth.tsx)
//
// auth.tsx calls setCurrentUserId() when the session changes.
// db.ts calls getCurrentUserId() inside every CRUD function.
// Neither needs to import the other.

let _currentUserId: string = 'local-user'

export function getCurrentUserId(): string {
  return _currentUserId
}

export function setCurrentUserId(id: string): void {
  _currentUserId = id
}
