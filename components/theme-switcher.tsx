"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Monitor, Moon } from "lucide-react"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-10 w-[140px] rounded-full bg-surface-subtle dark:bg-white/5 border border-border dark:border-white/10 animate-pulse" />
    )
  }

  const themes = [
    { value: "light", icon: Sun, label: "Light mode" },
    { value: "system", icon: Monitor, label: "System mode" },
    { value: "dark", icon: Moon, label: "Dark mode" },
  ]

  const getTransformValue = () => {
    const index = themes.findIndex((t) => t.value === theme)
    return `translateX(${index * 100}%)`
  }

  return (
    <div className="relative flex items-center p-1 bg-surface-subtle dark:bg-white/5 border border-border dark:border-white/10 rounded-full backdrop-blur">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          className={`relative z-10 p-2 rounded-full transition-colors duration-200 ${
            theme === value
              ? "text-white"
              : "text-foreground/60 dark:text-white/60 hover:text-foreground/80 dark:hover:text-white/80"
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <div
        className="absolute h-8 w-8 bg-emerald-500 rounded-full transition-transform duration-300 ease-out left-1"
        style={{ transform: getTransformValue() }}
      />
    </div>
  )
}
