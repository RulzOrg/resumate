"use client"

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface StreamingLoadingOverlayProps {
  section: 'summary' | 'skills' | 'interests'
}

const statusMessages = {
  summary: [
    { text: 'Analyzing your work experience...', duration: 800 },
    { text: 'Identifying key achievements...', duration: 1000 },
    { text: 'Crafting compelling narratives...', duration: 1200 },
    { text: 'Generating professional summaries...', duration: 1000 },
  ],
  skills: [
    { text: 'Reviewing your experience...', duration: 800 },
    { text: 'Extracting technical skills...', duration: 1000 },
    { text: 'Identifying industry trends...', duration: 1000 },
    { text: 'Suggesting relevant skills...', duration: 1200 },
  ],
  interests: [
    { text: 'Understanding your professional profile...', duration: 800 },
    { text: 'Analyzing career alignment...', duration: 1000 },
    { text: 'Curating professional interests...', duration: 1200 },
  ],
}

export function StreamingLoadingOverlay({ section }: StreamingLoadingOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const messages = statusMessages[section]
  const currentMessage = messages[currentMessageIndex]

  // Typing effect for current message
  useEffect(() => {
    if (!currentMessage) return

    setIsTyping(true)
    setDisplayedText('')

    const fullText = currentMessage.text
    let charIndex = 0

    const typingInterval = setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex + 1))
        charIndex++
      } else {
        setIsTyping(false)
        clearInterval(typingInterval)
      }
    }, 30) // 30ms per character for smooth typing

    return () => clearInterval(typingInterval)
  }, [currentMessage])

  // Move to next message after typing completes
  useEffect(() => {
    if (!isTyping && currentMessage) {
      const timer = setTimeout(() => {
        if (currentMessageIndex < messages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1)
        }
      }, currentMessage.duration)

      return () => clearTimeout(timer)
    }
  }, [isTyping, currentMessageIndex, currentMessage, messages.length])

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/95 backdrop-blur-sm rounded-2xl">
      <div className="max-w-md mx-auto px-6">
        {/* Animated Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-4">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Main Status */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            AI Enhancement in Progress
          </h3>
          <p className="text-sm text-neutral-400">
            Our AI is crafting personalized suggestions for you
          </p>
        </div>

        {/* Streaming Messages */}
        <div className="space-y-3 min-h-[120px]">
          {messages.map((message, idx) => {
            if (idx < currentMessageIndex) {
              // Completed messages
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-sm text-neutral-400 opacity-50 transition-opacity"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span>{message.text}</span>
                </div>
              )
            } else if (idx === currentMessageIndex) {
              // Current message with typing effect
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-sm text-emerald-400 font-medium"
                >
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"></div>
                  <span className="min-h-[20px]">
                    {displayedText}
                    {isTyping && (
                      <span className="inline-block w-1 h-4 bg-emerald-400 ml-0.5 animate-pulse"></span>
                    )}
                  </span>
                </div>
              )
            } else {
              // Future messages (hidden)
              return null
            }
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{
                width: `${((currentMessageIndex + 1) / messages.length) * 100}%`,
              }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-neutral-500 text-center">
            Step {currentMessageIndex + 1} of {messages.length}
          </div>
        </div>
      </div>
    </div>
  )
}
