import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost"
  children?: React.ReactNode
  showIcon?: boolean
}

/**
 * AIButton - A reusable button component for AI-powered features
 * 
 * Features:
 * - Emerald/teal color scheme
 * - Automatic loading state with spinner
 * - Sparkles icon indicator
 * - Accessible hover states and cursor pointer
 * 
 * @example
 * // Icon only button
 * <AIButton size="icon" onClick={handleGenerate} isLoading={loading} />
 * 
 * @example
 * // Button with text
 * <AIButton size="sm" onClick={handleGenerate} isLoading={loading}>
 *   AI Suggestions
 * </AIButton>
 */
export function AIButton({
  isLoading = false,
  size = "icon",
  variant = "outline",
  children,
  showIcon = true,
  className,
  disabled,
  ...props
}: AIButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={cn(
        "cursor-pointer",
        "hover:border-emerald-500/50 hover:bg-emerald-500/10",
        "transition-all",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className={cn(
            "animate-spin text-emerald-500",
            children ? "mr-2" : "",
            size === "sm" ? "h-3 w-3" : "h-4 w-4"
          )} />
          {children}
        </>
      ) : (
        <>
          {showIcon && (
            <Sparkles className={cn(
              "text-emerald-500",
              children ? "mr-2" : "",
              size === "sm" ? "h-3 w-3" : "h-4 w-4"
            )} />
          )}
          {children}
        </>
      )}
    </Button>
  )
}
