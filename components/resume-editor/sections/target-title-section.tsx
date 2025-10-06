"use client"

import { Check } from 'lucide-react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'

export function TargetTitleSection() {
  const { state, updateTargetTitle } = useEditor()
  const { targetTitle } = state

  return (
    <SectionWrapper title="Target Title">
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={targetTitle.include}
            onChange={(e) => updateTargetTitle('include', e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
            <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
          </span>
          <span className="sr-only">Include target title</span>
        </label>
        <label htmlFor="target-title" className="sr-only">
          Target job title
        </label>
        <input
          id="target-title"
          type="text"
          value={targetTitle.value}
          onChange={(e) => updateTargetTitle('value', e.target.value)}
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
          placeholder="e.g. Senior Software Engineer"
        />
      </div>
    </SectionWrapper>
  )
}
