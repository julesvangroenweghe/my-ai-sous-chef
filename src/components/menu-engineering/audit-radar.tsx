'use client'

interface AuditRadarProps {
  dimensions: Record<string, { score: number; opmerking?: string }>
  size?: number
}

const DIMENSION_LABELS: Record<string, string> = {
  stijlcoherentie: 'Stijl',
  haalbaarheid: 'Haalbaar',
  food_cost: 'Food Cost',
  verfijning: 'Verfijning',
  seizoensgebondenheid: 'Seizoen',
  ingredientenvariatie: 'Variatie',
  uitdaging: 'Uitdaging',
  vernieuwing: 'Vernieuwing',
  smaakbalans: 'Smaak',
  culinaire_logica: 'Logica',
}

const DIMENSION_ORDER = [
  'stijlcoherentie', 'haalbaarheid', 'food_cost', 'verfijning', 'seizoensgebondenheid',
  'ingredientenvariatie', 'uitdaging', 'vernieuwing', 'smaakbalans', 'culinaire_logica',
]

export default function AuditRadar({ dimensions, size = 280 }: AuditRadarProps) {
  const center = size / 2
  const radius = (size / 2) - 40
  const numAxes = DIMENSION_ORDER.length
  const angleStep = (2 * Math.PI) / numAxes

  const getPoint = (index: number, value: number) => {
    const angle = (index * angleStep) - (Math.PI / 2)
    const r = (value / 10) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Build polygon points for scores
  const scorePoints = DIMENSION_ORDER.map((key, i) => {
    const score = dimensions[key]?.score ?? 5
    const p = getPoint(i, score)
    return `${p.x},${p.y}`
  }).join(' ')

  // Grid circles
  const gridLevels = [2, 4, 6, 8, 10]

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 10) * radius}
            fill="none"
            stroke="rgb(68 64 60)"
            strokeWidth={level === 10 ? 1 : 0.5}
            opacity={0.4}
          />
        ))}

        {/* Axis lines and labels */}
        {DIMENSION_ORDER.map((key, i) => {
          const end = getPoint(i, 10)
          const labelPos = getPoint(i, 12.5)
          return (
            <g key={key}>
              <line
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="rgb(68 64 60)"
                strokeWidth={0.5}
                opacity={0.4}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#a8a29e"
                fontSize={9}
                fontFamily="Inter, sans-serif"
              >
                {DIMENSION_LABELS[key] || key}
              </text>
            </g>
          )
        })}

        {/* Score polygon */}
        <polygon
          points={scorePoints}
          fill="rgba(232, 160, 64, 0.15)"
          stroke="#E8A040"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {DIMENSION_ORDER.map((key, i) => {
          const score = dimensions[key]?.score ?? 5
          const p = getPoint(i, score)
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#E8A040"
              stroke="#0D0C0A"
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
    </div>
  )
}
