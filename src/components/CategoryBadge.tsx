import { useCategories, DEFAULT_CATEGORIES } from '../hooks/useCategories'
import { Badge } from '@/components/ui/badge'

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
  
  const meta = categories.find(c => c.name === category) 
    || DEFAULT_CATEGORIES.find(c => c.name === 'other')!

  return (
    <Badge
      variant="outline"
      className="gap-1 px-2 py-0.5 whitespace-nowrap"
      style={{
        color: meta.color,
        backgroundColor: hexToRgba(meta.color, 0.1),
        borderColor: hexToRgba(meta.color, 0.3),
      }}
    >
      {showIcon && <span className="text-xs">{meta.icon}</span>}
      <span className="capitalize">{meta.name}</span>
    </Badge>
  )
}
