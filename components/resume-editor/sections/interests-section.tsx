"use client"

import { Check, Plus, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'
import { StreamingLoadingOverlay } from '../streaming-loading-overlay'

export function InterestsSection() {
  const { state, resumeId, updateInterest, addInterest, removeInterest } = useEditor()
  const { interests, summaries } = state
  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const handleAddInterest = () => {
    if (inputValue.trim()) {
      addInterest(inputValue)
      setInputValue('')
      setShowInput(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddInterest()
    } else if (e.key === 'Escape') {
      setInputValue('')
      setShowInput(false)
    }
  }

  const handleGenerate = async () => {
    setIsEnhancing(true)
    setSuggestions([])
    try {
      const response = await fetch(`/api/resumes/${resumeId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'interests',
          context: {
            professionalSummary: summaries[0]?.value || '',
            currentInterests: interests.map(i => i.value)
          }
        })
      })
      
      const data = await response.json()
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions)
      } else {
        alert('Failed to generate suggestions. Please try again.')
      }
    } catch (error) {
      console.error('Enhancement failed:', error)
      alert('Failed to generate suggestions. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <SectionWrapper title="Interests" onEnhance={handleGenerate}>
      <div className="relative">
        {/* Loading Overlay */}
        {isEnhancing && <StreamingLoadingOverlay section="interests" />}
        
        <div className="space-y-4">
        <p className="text-sm text-neutral-400">
          Click an interest to toggle inclusion. Hover to remove.
        </p>

        {/* Interest Chips */}
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <div key={interest.id} className="group relative">
              <label className="inline-block cursor-pointer">
                <input
                  type="checkbox"
                  checked={interest.include}
                  onChange={(e) => updateInterest(interest.id, 'include', e.target.checked)}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-700 ring-1 ring-inset ring-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-sm transition peer-checked:border-emerald-600 peer-checked:ring-emerald-600/40 peer-checked:bg-neutral-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-600 peer-checked:bg-emerald-500 transition"></span>
                  <span>{interest.value}</span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeInterest(interest.id)}
                className="absolute -top-2 -right-2 hidden group-hover:inline-flex h-5 w-5 rounded-full bg-neutral-800 hover:bg-red-600 items-center justify-center transition"
                title="Remove interest"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add Interest Input/Button */}
          {showInput ? (
            <div className="inline-flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!inputValue.trim()) {
                    setShowInput(false)
                  }
                }}
                autoFocus
                placeholder="Interest name"
                className="w-32 rounded-lg bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-emerald-600 hover:bg-emerald-500 transition"
                title="Add interest"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputValue('')
                  setShowInput(false)
                }}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-neutral-800 hover:bg-neutral-700 transition"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-neutral-300 transition"
            >
              <Plus className="h-4 w-4" />
              Add interest
            </button>
          )}
        </div>

        {interests.length === 0 && (
          <p className="text-sm text-neutral-500 italic">
            No interests added yet. Click "Add interest" to get started.
          </p>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4 p-4 rounded-lg border border-emerald-600/40 bg-emerald-950/20">
            <h4 className="text-sm font-medium text-emerald-400 mb-3 inline-flex items-center gap-2">
              {isEnhancing && <Loader2 className="h-4 w-4 animate-spin" />}
              Suggested Interests
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((interest, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    addInterest(interest)
                    setSuggestions(prev => prev.filter((_, i) => i !== idx))
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-950/40 hover:bg-emerald-900/40 text-sm transition"
                >
                  <Plus className="h-3 w-3" />
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </SectionWrapper>
  )
}
