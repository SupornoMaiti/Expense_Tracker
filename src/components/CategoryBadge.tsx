
export type Category =
  | 'food'
  | 'transport'
  | 'rent'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'education'
  | 'salary'
  | 'freelance'
  | 'other'

const CATEGORY_META: Record<Category, { color: string; bg: string; icon: string }> = {
  food:          { color: '#ffa502', bg: 'rgba(255,165,2,0.12)',   icon: '🍜' },
  transport:     { color: '#3498db', bg: 'rgba(52,152,219,0.12)',  icon: '🚌' },
  rent:          { color: '#9b59b6', bg: 'rgba(155,89,182,0.12)', icon: '🏠' },
  utilities:     { color: '#e67e22', bg: 'rgba(230,126,34,0.12)', icon: '⚡' },
  shopping:      { color: '#e91e63', bg: 'rgba(233,30,99,0.12)',  icon: '🛍️' },
  health:        { color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', icon: '💊' },
  entertainment: { color: '#f39c12', bg: 'rgba(243,156,18,0.12)', icon: '🎮' },
  education:     { color: '#1abc9c', bg: 'rgba(26,188,156,0.12)', icon: '📚' },
  salary:        { color: '#00ff88', bg: 'rgba(0,255,136,0.12)',  icon: '💼' },
  freelance:     { color: '#00ff88', bg: 'rgba(0,255,136,0.10)',  icon: '💻' },
  other:         { color: '#888888', bg: 'rgba(136,136,136,0.12)',icon: '📌' },
}

interface Props {
  category: string
  showIcon?: boolean
}

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[]

export default function CategoryBadge({ category, showIcon = true }: Props) {
  const meta = CATEGORY_META[category as Category] ?? CATEGORY_META.other

  return (
    <span
      className="badge"
      style={{
        color: meta.color,
        backgroundColor: meta.bg,
        borderColor: meta.color + '55',
      }}
    >
      {showIcon && <span style={{ marginRight: 4 }}>{meta.icon}</span>}
      {category}
    </span>
  )
}
