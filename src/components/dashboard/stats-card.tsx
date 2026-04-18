import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: { value: number; positive: boolean }
  className?: string
}

export function StatsCard({ title, value, description, icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn('text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
