"use client"

import { useState, useRef, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Play, Pause, Volume2, VolumeX, Maximize, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WelcomeVideoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  videoUrl: string
}

export function WelcomeVideoModal({
  open,
  onOpenChange,
  onComplete,
  videoUrl,
}: WelcomeVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false)

  // Auto-play when modal opens
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, user needs to interact
      })
    }
  }, [open])

  const handleClose = () => {
    if (!hasMarkedComplete) {
      onComplete()
      setHasMarkedComplete(true)
    }
    onOpenChange(false)
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress =
        (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(currentProgress)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickPosition = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = clickPosition * videoRef.current.duration
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
  }

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-foreground/50 dark:bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-3xl",
            "translate-x-[-50%] translate-y-[-50%]",
            "bg-background rounded-xl border border-border shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "overflow-hidden"
          )}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 rounded-full p-2 bg-foreground/10 hover:bg-foreground/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-xl font-semibold font-space-grotesk">
                Welcome to ResuMate AI!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Watch this quick video to learn how to get the most out of your
                resume optimization experience.
              </p>
            </div>

            {/* Video Container */}
            <div className="relative bg-black aspect-video w-full group">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnd}
                playsInline
              />

              {/* Video Controls Overlay */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                )}
              >
                {/* Progress Bar */}
                <div
                  className="w-full h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Center play button when paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full transition-colors"
                  aria-label="Play video"
                >
                  <Play className="h-8 w-8" />
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                You can rewatch this video anytime from the header.
              </p>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Get Started
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
