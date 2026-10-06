import {
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Landmark,
  MonitorPlay,
  Package,
  PiggyBank,
  Plane,
  Shapes,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  house: House,
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  car: Car,
  'heart-pulse': HeartPulse,
  ticket: Ticket,
  'graduation-cap': GraduationCap,
  'monitor-play': MonitorPlay,
  package: Package,
  shapes: Shapes,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  wallet: Wallet,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  plane: Plane,
  gift: Gift,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  film: Film,
  coffee: Coffee,
  utensils: Utensils,
  zap: Zap,
}

interface CategoryIconProps {
  name: string
  className?: string
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = icons[name] ?? Shapes
  return <Icon className={className} aria-hidden="true" />
}

export function categoryIconKeys(): string[] {
  return Object.keys(icons)
}
