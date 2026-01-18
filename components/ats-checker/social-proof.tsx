"use client"

import { Star } from "lucide-react"

const AVATARS = [
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/8.jpg",
  "https://randomuser.me/api/portraits/women/39.jpg",
]

export function SocialProof() {
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      {/* Avatar Stack */}
      <div className="flex -space-x-3">
        {AVATARS.map((src, index) => (
          <div
            key={index}
            className="relative"
            style={{ zIndex: AVATARS.length - index }}
          >
            <img
              src={src}
              alt={`User ${index + 1}`}
              className="h-9 w-9 rounded-full ring-2 ring-white dark:ring-background object-cover"
            />
          </div>
        ))}
      </div>

      {/* Rating and Text */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground mt-1 font-sans">
          Run a quick ATS health check
        </p>
      </div>
    </div>
  )
}
