import { Shapes } from 'lucide-react'
import { icons } from '@/components/category-icons'

interface CategoryIconProps {
  name: string
  className?: string
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = icons[name] ?? Shapes
  return <Icon className={className} aria-hidden="true" />
}
