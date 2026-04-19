'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChefHat } from 'lucide-react'
import type { ChefProfile } from '@/types/database'

interface ProfileCardProps {
 profile: ChefProfile
 className?: string
 compact?: boolean
}

export function ProfileCard({ profile, className, compact = false }: ProfileCardProps) {
 const initials = profile.display_name
 .split(' ')
 .map((n) => n[0])
 .join('')
 .toUpperCase()
 .slice(0, 2)

 return (
 <Card className={cn('overflow-hidden', className)}>
 <CardContent className={cn('flex items-center gap-4', compact ? 'p-3' : 'p-5')}>
 <Avatar className={cn(compact ? 'h-10 w-10' : 'h-14 w-14')}>
 {profile.avatar_url ? (
 <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
 ) : (
 <AvatarFallback
 className={cn(
 'bg-orange-100 text-orange-700 font-semibold',
 compact ? 'text-sm' : 'text-lg'
 )}
 >
 {initials || <ChefHat className="h-5 w-5" />}
 </AvatarFallback>
 )}
 </Avatar>

 <div className="flex-1 min-w-0">
 <h3 className={cn('font-semibold truncate', compact ? 'text-sm' : 'text-base')}>
 {profile.display_name}
 </h3>
 {profile.current_role && (
 <p className="text-sm text-muted-foreground truncate">{profile.current_role}</p>
 )}
 {profile.years_experience && (
 <p className="text-xs text-muted-foreground">
 {profile.years_experience} years experience
 </p>
 )}

 {!compact && profile.cuisine_styles.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2">
 {profile.cuisine_styles.slice(0, 3).map((style) => (
 <Badge key={style} variant="secondary" className="text-[10px] px-1.5 py-0">
 {style}
 </Badge>
 ))}
 {profile.cuisine_styles.length > 3 && (
 <Badge variant="outline" className="text-[10px] px-1.5 py-0">
 +{profile.cuisine_styles.length - 3}
 </Badge>
 )}
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )
}
