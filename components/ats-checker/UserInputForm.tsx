"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RequiredInput } from "@/lib/ats-checker/fix-strategies"

interface UserInputFormProps {
  fields: RequiredInput[]
  onSubmit: (values: Record<string, string>) => void
  isLoading?: boolean
}

export function UserInputForm({ fields, onSubmit, isLoading }: UserInputFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate all fields have values
    const allFilled = fields.every(f => values[f.field]?.trim())
    if (!allFilled) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        We need a bit of info to generate this fix:
      </p>
      {fields.map((field) => (
        <div key={field.field} className="space-y-1.5">
          <Label htmlFor={field.field} className="text-xs">
            {field.label}
          </Label>
          <Input
            id={field.field}
            type={field.type}
            placeholder={field.placeholder}
            value={values[field.field] || ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.field]: e.target.value }))
            }
            className="h-8 text-sm"
            required
          />
        </div>
      ))}
      <Button type="submit" size="sm" className="w-full" disabled={isLoading}>
        {isLoading ? "Generating fix..." : "Generate Fix Preview"}
      </Button>
    </form>
  )
}
