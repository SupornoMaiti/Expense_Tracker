import { useCategories, DEFAULT_CATEGORIES } from '../hooks/useCategories'

interface Props {
  category: string
  showIcon?: boolean
}

// Convert hex to rgb for background opacity
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 136
  const g = parseInt(hex.slice(3, 5), 16) || 136
  const b = parseInt(hex.slice(5, 7), 16) || 136
  return `rgba(${r},${g},${b},${alpha})`
}

export default function CategoryBadge({ category, showIcon = true }: Props) {
  const { categories } = useCategories()
  
  // Find category or fallback to 'other'
  const meta = categories.find(c => c.name === category) 
    || DEFAULT_CATEGORIES.find(c => c.name === 'other')!

  return (
    <span
      className="badge"
      style={{
        color: meta.color,
        backgroundColor: hexToRgba(meta.color, 0.12),
        borderColor: hexToRgba(meta.color, 0.3),
      }}
    >
      {showIcon && <span style={{ marginRight: 4 }}>{meta.icon}</span>}
      {meta.name}
    </span>
  )
}
