import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface Activity {
 id: string
 action: string
 subject: string
 timestamp: string
}

interface ActivityFeedProps {
 activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Recent Activity</CardTitle>
 </CardHeader>
 <CardContent>
 {activities.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-8">
 No recent activity. Start by creating a recipe!
 </p>
 ) : (
 <div className="space-y-4">
 {activities.map((activity) => (
 <div key={activity.id} className="flex items-start gap-3">
 <div className="p-1.5 bg-muted rounded-full mt-0.5">
 <Clock className="h-3 w-3 text-muted-foreground" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm">
 <span className="font-medium">{activity.action}</span>{' '}
 <span className="text-muted-foreground">{activity.subject}</span>
 </p>
 <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 )
}
