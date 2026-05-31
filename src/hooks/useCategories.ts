import { useState, useEffect, useCallback } from 'react'
import { getAllCategories } from '../lib/db'
import type { Category } from '../lib/db'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', user_id: 'system', name: 'food', icon: '🍜', color: '#ffa502', created_at: '' },
  { id: 'transport', user_id: 'system', name: 'transport', icon: '🚌', color: '#3498db', created_at: '' },
  { id: 'rent', user_id: 'system', name: 'rent', icon: '🏠', color: '#9b59b6', created_at: '' },
  { id: 'utilities', user_id: 'system', name: 'utilities', icon: '⚡', color: '#e67e22', created_at: '' },
  { id: 'shopping', user_id: 'system', name: 'shopping', icon: '🛍️', color: '#e91e63', created_at: '' },
  { id: 'health', user_id: 'system', name: 'health', icon: '💊', color: '#2ecc71', created_at: '' },
  { id: 'entertainment', user_id: 'system', name: 'entertainment', icon: '🎮', color: '#f39c12', created_at: '' },
  { id: 'education', user_id: 'system', name: 'education', icon: '📚', color: '#1abc9c', created_at: '' },
  { id: 'other', user_id: 'system', name: 'other', icon: '📌', color: '#888888', created_at: '' },
]

let globalCustomCategories: Category[] | null = null

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(() => {
    return globalCustomCategories ? [...DEFAULT_CATEGORIES, ...globalCustomCategories] : DEFAULT_CATEGORIES
  })
  const [loading, setLoading] = useState(!globalCustomCategories)

  const refresh = useCallback(async () => {
    try {
      const custom = await getAllCategories()
      globalCustomCategories = custom
      setCategories([...DEFAULT_CATEGORIES, ...custom])
    } catch (err) {
      console.error('Failed to load categories', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Listen for custom event if needed
    const onUpdate = () => refresh()
    window.addEventListener('categories-updated', onUpdate)
    return () => window.removeEventListener('categories-updated', onUpdate)
  }, [refresh])

  return { categories, loading, refresh }
}
