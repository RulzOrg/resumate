"use client"

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
}

export function CircularProgress({ value, size = 48, strokeWidth = 4 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  // Determine color based on score
  const getColor = () => {
    if (value >= 80) return "stroke-emerald-500"
    if (value >= 50) return "stroke-amber-500"
    return "stroke-red-500"
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getColor()}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      {/* Score text */}
      <span className="absolute text-xs font-medium text-white/90 font-geist">
        {Math.round(value)}%
      </span>
    </div>
  )
}
