"use client"

import { useState } from 'react'
import { Check, Plus, X, Loader2 } from 'lucide-react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'
import { StreamingLoadingOverlay } from '../streaming-loading-overlay'

export function SummarySection() {
  const { state, resumeId, updateSummary, addSummary, removeSummary } = useEditor()
  const { summaries } = state
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleGenerate = async () => {
    setIsEnhancing(true)
    setSuggestions([])
    try {
      const response = await fetch(`/api/resumes/${resumeId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'summary',
          context: {
            currentSummary: summaries[0]?.value || '',
            experience: state.experience.map(exp => ({
              company: exp.company,
              role: exp.role,
              bullets: exp.bullets.filter(b => b.include).map(b => b.value)
            })),
            targetRole: state.targetTitle.value
          }
        })
      })
      
      const data = await response.json()
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions)
        setShowSuggestions(true)
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
    <SectionWrapper title="Professional Summary" onEnhance={handleGenerate}>
      <div className="relative">
        {/* Loading Overlay */}
        {isEnhancing && <StreamingLoadingOverlay section="summary" />}
        
        <div className="space-y-4">
        {summaries.map((summary, index) => (
          <div key={summary.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">
                Summary option {index + 1}
              </label>
              {summaries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSummary(summary.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-xs font-medium transition"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
            
            <div className="flex items-start gap-2">
              <label className="relative inline-flex items-center cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={summary.include}
                  onChange={(e) => updateSummary(summary.id, 'include', e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                  <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                </span>
              </label>
              <textarea
                value={summary.value}
                onChange={(e) => updateSummary(summary.id, 'value', e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm resize-y"
                placeholder="Write a compelling professional summary highlighting your experience and skills..."
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addSummary}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Add summary option
        </button>

        {/* AI Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-4 rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-emerald-400 inline-flex items-center gap-2">
                {isEnhancing && <Loader2 className="h-4 w-4 animate-spin" />}
                AI Suggestions
              </h4>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-neutral-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <p className="text-sm text-neutral-200 mb-2">{suggestion}</p>
                  <button
                    onClick={() => {
                      // Replace the first summary's value with the suggestion
                      if (summaries.length > 0) {
                        updateSummary(summaries[0].id, 'value', suggestion)
                        updateSummary(summaries[0].id, 'include', true)
                      } else {
                        // If no summaries exist, add a new one
                        addSummary()
                        setTimeout(() => {
                          if (summaries.length > 0) {
                            updateSummary(summaries[0].id, 'value', suggestion)
                            updateSummary(summaries[0].id, 'include', true)
                          }
                        }, 10)
                      }
                      // Remove this suggestion from the list
                      setSuggestions(prev => prev.filter((_, i) => i !== idx))
                      // Hide suggestions panel when all used
                      if (suggestions.length === 1) {
                        setShowSuggestions(false)
                      }
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Use this summary
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </SectionWrapper>
  )
}
