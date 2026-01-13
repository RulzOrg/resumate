"use client"

import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
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
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false)

  const handleClose = () => {
    if (!hasMarkedComplete) {
      onComplete()
      setHasMarkedComplete(true)
    }
    onOpenChange(false)
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
                Welcome to Useresumate!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Watch this quick video to learn how to get the most out of your
                resume optimization experience.
              </p>
            </div>

            {/* Video Container - Tella.tv iframe embed */}
            <div className="relative bg-black aspect-video w-full">
              <iframe
                src={videoUrl}
                className="absolute top-0 left-0 w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen"
              />
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
