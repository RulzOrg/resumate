"use client"

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface StreamingLoadingOverlayProps {
  section: 'summary' | 'skills' | 'interests'
}

const statusMessages = {
  summary: [
    'Analyzing your experience...',
    'Generating suggestions...',
  ],
  skills: [
    'Reviewing your background...',
    'Suggesting skills...',
  ],
  interests: [
    'Analyzing your profile...',
    'Curating interests...',
  ],
}

export function StreamingLoadingOverlay({ section }: StreamingLoadingOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const messages = statusMessages[section]

  // Rotate through messages
  useEffect(() => {
    setCurrentMessageIndex(0) // Reset to first message when section changes
    
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [section, messages.length])

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm rounded-2xl">
      <div className="text-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-neutral-300 font-medium">
          {messages[currentMessageIndex]}
        </p>
      </div>
    </div>
  )
}
