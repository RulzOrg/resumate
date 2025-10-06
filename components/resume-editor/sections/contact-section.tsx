"use client"

import { Check } from 'lucide-react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'

export function ContactSection() {
  const { state, updateContact } = useEditor()
  const { contact } = state

  return (
    <SectionWrapper title="Contact Information">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName-input" className="block text-sm text-neutral-300 mb-2">First name</label>
          <div className="flex items-center gap-2">
            <label htmlFor="firstName-checkbox" className="relative inline-flex items-center cursor-pointer">
              <input
                id="firstName-checkbox"
                type="checkbox"
                checked={contact.firstName.include}
                onChange={(e) => updateContact('firstName', 'include', e.target.checked)}
                className="peer sr-only"
                aria-checked={contact.firstName.include}
              />
              <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
              </span>
            </label>
            <input
              id="firstName-input"
              type="text"
              value={contact.firstName.value}
              onChange={(e) => updateContact('firstName', 'value', e.target.value)}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
              placeholder="John"
            />
          </div>
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName-input" className="block text-sm text-neutral-300 mb-2">Last name</label>
          <div className="flex items-center gap-2">
            <label htmlFor="lastName-checkbox" className="relative inline-flex items-center cursor-pointer">
              <input
                id="lastName-checkbox"
                type="checkbox"
                checked={contact.lastName.include}
                onChange={(e) => updateContact('lastName', 'include', e.target.checked)}
                className="peer sr-only"
                aria-checked={contact.lastName.include}
              />
              <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
              </span>
            </label>
            <input
              id="lastName-input"
              type="text"
              value={contact.lastName.value}
              onChange={(e) => updateContact('lastName', 'value', e.target.value)}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Contact Row */}
        <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Email */}
          <div>
            <label htmlFor="email-input" className="block text-sm text-neutral-300 mb-2">Email</label>
            <div className="flex items-center gap-2">
              <label htmlFor="email-checkbox" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="email-checkbox"
                  type="checkbox"
                  checked={contact.email.include}
                  onChange={(e) => updateContact('email', 'include', e.target.checked)}
                  className="peer sr-only"
                  aria-checked={contact.email.include}
                />
                <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                  <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                </span>
              </label>
              <input
                id="email-input"
                type="email"
                value={contact.email.value}
                onChange={(e) => updateContact('email', 'value', e.target.value)}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone-input" className="block text-sm text-neutral-300 mb-2">Phone</label>
            <div className="flex items-center gap-2">
              <label htmlFor="phone-checkbox" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="phone-checkbox"
                  type="checkbox"
                  checked={contact.phone.include}
                  onChange={(e) => updateContact('phone', 'include', e.target.checked)}
                  className="peer sr-only"
                  aria-checked={contact.phone.include}
                />
                <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                  <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                </span>
              </label>
              <input
                id="phone-input"
                type="tel"
                value={contact.phone.value}
                onChange={(e) => updateContact('phone', 'value', e.target.value)}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label htmlFor="linkedin-input" className="block text-sm text-neutral-300 mb-2">LinkedIn</label>
            <div className="flex items-center gap-2">
              <label htmlFor="linkedin-checkbox" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="linkedin-checkbox"
                  type="checkbox"
                  checked={contact.linkedin.include}
                  onChange={(e) => updateContact('linkedin', 'include', e.target.checked)}
                  className="peer sr-only"
                  aria-checked={contact.linkedin.include}
                />
                <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                  <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                </span>
              </label>
              <input
                id="linkedin-input"
                type="text"
                value={contact.linkedin.value}
                onChange={(e) => updateContact('linkedin', 'value', e.target.value)}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                placeholder="linkedin.com/in/johndoe"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location-input" className="block text-sm text-neutral-300 mb-2">Location</label>
            <div className="flex items-center gap-2">
              <label htmlFor="location-checkbox" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="location-checkbox"
                  type="checkbox"
                  checked={contact.location.include}
                  onChange={(e) => updateContact('location', 'include', e.target.checked)}
                  className="peer sr-only"
                  aria-checked={contact.location.include}
                />
                <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-neutral-950 transition">
                  <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                </span>
              </label>
              <input
                id="location-input"
                type="text"
                value={contact.location.value}
                onChange={(e) => updateContact('location', 'value', e.target.value)}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                placeholder="New York, NY"
              />
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
