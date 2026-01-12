"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface TourSpotlightProps {
  targetRect: DOMRect | null
  padding?: number
}

export function TourSpotlight({ targetRect, padding = 8 }: TourSpotlightProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !targetRect) return null

  // Calculate the spotlight cutout with padding
  const x = targetRect.left - padding
  const y = targetRect.top - padding
  const width = targetRect.width + padding * 2
  const height = targetRect.height + padding * 2
  const radius = 8

  // Create SVG path for the overlay with a rounded rectangle cutout
  const overlayPath = `
    M 0 0
    H ${window.innerWidth}
    V ${window.innerHeight}
    H 0
    V 0
    Z
    M ${x + radius} ${y}
    H ${x + width - radius}
    Q ${x + width} ${y} ${x + width} ${y + radius}
    V ${y + height - radius}
    Q ${x + width} ${y + height} ${x + width - radius} ${y + height}
    H ${x + radius}
    Q ${x} ${y + height} ${x} ${y + height - radius}
    V ${y + radius}
    Q ${x} ${y} ${x + radius} ${y}
    Z
  `

  return createPortal(
    <div
      className="fixed inset-0 z-[60] pointer-events-none"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={radius}
              ry={radius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto"
        />
      </svg>
    </div>,
    document.body
  )
}
