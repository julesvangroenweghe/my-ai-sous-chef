'use client'

import Link from 'next/link'
import { Plus, Calendar, Receipt, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'

const actions = [
 { href: '/recipes/new', label: 'New Recipe', icon: Utensils, color: 'bg-orange-500' },
 { href: '/events/new', label: 'New Event', icon: Calendar, color: 'bg-blue-500' },
 { href: '/invoices', label: 'Scan Invoice', icon: Receipt, color: 'bg-green-500' },
]

export function QuickActions() {
 return (
 <div className="flex flex-wrap gap-3">
 {actions.map((action) => (
 <Link key={action.href} href={action.href}>
 <Button variant="outline" className="gap-2 h-11">
 <div className={`p-1 rounded ${action.color} text-white`}>
 <Plus className="h-3 w-3" />
 </div>
 {action.label}
 </Button>
 </Link>
 ))}
 </div>
 )
}
