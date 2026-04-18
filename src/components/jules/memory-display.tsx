import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Heart, Flame, Leaf, Star, MessageCircle } from 'lucide-react'
import type { ChefMemory } from '@/types/database'

const typeIcons: Record<string, React.ReactNode> = {
  preference: <Heart className="h-4 w-4" />,
  technique: <Flame className="h-4 w-4" />,
  ingredient_affinity: <Leaf className="h-4 w-4" />,
  flavor_profile: <Star className="h-4 w-4" />,
  habit: <Brain className="h-4 w-4" />,
  feedback: <MessageCircle className="h-4 w-4" />,
}

interface MemoryDisplayProps {
  memories: ChefMemory[]
}

export function MemoryDisplay({ memories }: MemoryDisplayProps) {
  const grouped = memories.reduce((acc, mem) => {
    if (!acc[mem.memory_type]) acc[mem.memory_type] = []
    acc[mem.memory_type].push(mem)
    return acc
  }, {} as Record<string, ChefMemory[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Chef Memory
        </CardTitle>
      </CardHeader>
      <CardContent>
        {memories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Jules is still learning about your style. Keep cooking!
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, mems]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  {typeIcons[type]}
                  <h3 className="text-sm font-semibold capitalize">{type.replace('_', ' ')}</h3>
                  <Badge variant="secondary" className="text-xs">{mems.length}</Badge>
                </div>
                <div className="space-y-1 pl-6">
                  {mems.slice(0, 5).map((mem) => (
                    <div key={mem.id} className="flex items-center justify-between text-sm">
                      <span>{mem.key}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(mem.confidence || 1) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
