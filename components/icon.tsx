'use client'

import {
  Wrench,
  Sun,
  ChefHat,
  Car,
  Scissors,
  Smartphone,
  Hammer,
  HeartPulse,
  Bot,
  Search,
  MessageSquare,
  Handshake,
  MapPin,
  Hand,
  AlertTriangle,
  type LucideProps,
} from 'lucide-react'

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  wrench: Wrench,
  sun: Sun,
  chefHat: ChefHat,
  car: Car,
  scissors: Scissors,
  smartphone: Smartphone,
  hammer: Hammer,
  heartPulse: HeartPulse,
  bot: Bot,
  search: Search,
  messageSquare: MessageSquare,
  handshake: Handshake,
  mapPin: MapPin,
  hand: Hand,
  alertTriangle: AlertTriangle,
}

export default function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name]
  return Component ? <Component className={className} /> : null
}
