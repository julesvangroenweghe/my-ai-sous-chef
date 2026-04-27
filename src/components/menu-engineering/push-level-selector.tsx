'use client'

interface PushLevelSelectorProps {
  value: string
  onChange: (level: string) => void
}

const LEVELS = [
  {
    value: 'comfort',
    label: 'Comfort',
    description: 'Blijf dicht bij vertrouwde technieken en smaken. Ideaal voor betrouwbare events.',
    color: '#4ade80',
  },
  {
    value: 'balanced',
    label: 'Gebalanceerd',
    description: 'Mix van vertrouwd en vernieuwend. De standaard voor groei.',
    color: '#E8A040',
  },
  {
    value: 'challenge',
    label: 'Uitdagend',
    description: 'Durf te vernieuwen. Onverwachte combinaties en nieuwe technieken.',
    color: '#f87171',
  },
]

export default function PushLevelSelector({ value, onChange }: PushLevelSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-stone-400 font-medium">Ambitieniveau</label>
      <div className="grid grid-cols-3 gap-3">
        {LEVELS.map((level) => {
          const isActive = value === level.value
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className="text-left p-3 rounded-xl border transition-all"
              style={{
                backgroundColor: isActive ? `${level.color}15` : 'rgb(28 25 23 / 0.5)',
                borderColor: isActive ? `${level.color}60` : 'rgb(68 64 60)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isActive ? level.color : '#57534e' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: isActive ? level.color : '#a8a29e' }}
                >
                  {level.label}
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">{level.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
