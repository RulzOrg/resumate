"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Lock, Unlock, User, Mail, Phone, Linkedin, MapPin, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TipsSection } from "./tips-section"
import type { UIContactInformation } from "@/lib/schemas-v2"

interface ContactInfoSectionProps {
  data: UIContactInformation
  onChange: (updates: Partial<UIContactInformation>) => void
}

export function ContactInfoSection({ data, onChange }: ContactInfoSectionProps) {
  const handleFieldChange = (field: keyof UIContactInformation["fields"], value: string) => {
    onChange({
      fields: {
        ...data.fields,
        [field]: value,
      },
    })
  }

  const handleLockToggle = (field: keyof UIContactInformation["locks"]) => {
    onChange({
      locks: {
        ...data.locks,
        [field]: !data.locks[field],
      },
    })
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /[\d\s\-\+\(\)]/
    return phone.length > 0 && phoneRegex.test(phone)
  }

  const validateLinkedin = (linkedin: string) => {
    return linkedin.includes('linkedin.com') || linkedin.includes('in/')
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case "first_name":
      case "last_name":
        return <User className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "linkedin":
        return <Linkedin className="h-4 w-4" />
      case "location":
        return <MapPin className="h-4 w-4" />
      default:
        return null
    }
  }

  const getFieldValidation = (field: string, value: string) => {
    if (!value.trim()) return null
    
    switch (field) {
      case "email":
        return validateEmail(value) ? "text-neutral-300" : "text-red-500"
      case "phone":
        return validatePhone(value) ? "text-neutral-300" : "text-red-500"
      case "linkedin":
        return validateLinkedin(value) ? "text-neutral-300" : "text-red-500"
      default:
        return null
    }
  }

  const fields: Array<{
    key: keyof UIContactInformation["fields"]
    label: string
    placeholder: string
    type?: string
    validationTip?: string
  }> = [
    { key: "first_name", label: "First Name", placeholder: "John", validationTip: "Legal first name as it appears on documents" },
    { key: "last_name", label: "Last Name", placeholder: "Doe", validationTip: "Legal last name as it appears on documents" },
    { key: "email", label: "Email", placeholder: "john@example.com", type: "email", validationTip: "Professional email address" },
    { key: "phone", label: "Phone", placeholder: "+1 (555) 123-4567", type: "tel", validationTip: "Include country code for international applications" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/johndoe", validationTip: "Full LinkedIn profile URL" },
    { key: "location", label: "Location", placeholder: "San Francisco, CA", validationTip: "City, State or City, Country format" },
  ]

  return (
    <TooltipProvider>
      <Card className="relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Essential contact details for recruiters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Locked fields won't be changed by AI optimization</p>
                </TooltipContent>
              </Tooltip>
              <Switch
                checked={data.include}
                onCheckedChange={(checked) => onChange({ include: checked })}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.key} className={`space-y-2 ${field.key === 'linkedin' || field.key === 'location' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor={field.key} 
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    {getFieldIcon(field.key)}
                    {field.label}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleLockToggle(field.key as keyof UIContactInformation["locks"])}
                        className={`transition-colors ${
                          data.locks[field.key as keyof UIContactInformation["locks"]] 
                            ? "text-amber-500 hover:text-amber-600" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={data.locks[field.key as keyof UIContactInformation["locks"]] ? "Locked - AI won't modify" : "Unlocked - AI can optimize"}
                      >
                        {data.locks[field.key as keyof UIContactInformation["locks"]] ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{data.locks[field.key as keyof UIContactInformation["locks"]] 
                        ? "Locked - AI won't modify this field" 
                        : "Unlocked - AI can optimize this field"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <Input
                    id={field.key}
                    type={field.type || "text"}
                    value={data.fields[field.key]}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={!data.include}
                    className={`${getFieldValidation(field.key, data.fields[field.key]) || ''} pr-10`}
                  />
                  {data.fields[field.key] && getFieldValidation(field.key, data.fields[field.key]) && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validateEmail(data.fields[field.key]) && field.key === 'email' && (
                        <Mail className="h-4 w-4 text-neutral-400" />
                      )}
                      {validatePhone(data.fields[field.key]) && field.key === 'phone' && (
                        <Phone className="h-4 w-4 text-neutral-400" />
                      )}
                      {validateLinkedin(data.fields[field.key]) && field.key === 'linkedin' && (
                        <Linkedin className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                  )}
                </div>
                {data.fields[field.key] && !validateEmail(data.fields[field.key]) && field.key === 'email' && (
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
                {data.fields[field.key] && !validatePhone(data.fields[field.key]) && field.key === 'phone' && (
                  <p className="text-xs text-red-500">Please enter a valid phone number</p>
                )}
                {data.fields[field.key] && !validateLinkedin(data.fields[field.key]) && field.key === 'linkedin' && (
                  <p className="text-xs text-red-500">Please enter a valid LinkedIn URL</p>
                )}
                {field.validationTip && (
                  <p className="text-xs text-muted-foreground italic">{field.validationTip}</p>
                )}
              </div>
            ))}
          </div>

          {data.warnings.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Recommendations:</p>
                  {data.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm">• {warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <TipsSection
            title="Contact Tips"
            description="Professional presentation for recruiter outreach"
            tips={[
              "Ensure all contact information is professional and up-to-date.",
              "Use a professional email address (avoid nicknames or outdated domains).",
              "Include country code for international phone numbers.",
              "LinkedIn profile should be complete and match your resume."
            ]}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
