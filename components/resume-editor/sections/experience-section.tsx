"use client"

import { Check, Plus, X, GripVertical } from 'lucide-react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'

export function ExperienceSection() {
  const { 
    state, 
    updateExperience, 
    addExperience, 
    removeExperience,
    updateBullet,
    addBullet,
    removeBullet
  } = useEditor()
  const { experience } = state

  return (
    <SectionWrapper title="Work Experience">
      <div className="space-y-4">
        {experience.map((exp, expIndex) => (
          <div 
            key={exp.id} 
            className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4"
          >
            {/* Experience Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <label className="relative inline-flex items-center cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={exp.include}
                    onChange={(e) => updateExperience(exp.id, { include: e.target.checked })}
                    className="peer sr-only"
                  />
                  <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                    <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                  </span>
                </label>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-neutral-400">Experience {expIndex + 1}</span>
                </div>
              </div>
              
              {experience.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExperience(exp.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-xs font-medium transition"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Company</label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                placeholder="e.g. Google"
              />
            </div>

            {/* Role & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Role & Location</label>
                <input
                  type="text"
                  value={exp.role}
                  onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                  placeholder="e.g. Senior Engineer · San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Dates</label>
                <input
                  type="text"
                  value={exp.dates}
                  onChange={(e) => updateExperience(exp.id, { dates: e.target.value })}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                  placeholder="e.g. Jan 2020 – Present"
                />
              </div>
            </div>

            {/* Bullets */}
            <div>
              <label className="block text-sm text-neutral-300 mb-2">Key achievements</label>
              <div className="space-y-2">
                {exp.bullets.map((bullet, bulletIndex) => (
                  <div key={bullet.id} className="flex items-start gap-2 group">
                    <label className="relative inline-flex items-center cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={bullet.include}
                        onChange={(e) => updateBullet(exp.id, bullet.id, 'include', e.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                        <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                      </span>
                    </label>
                    <textarea
                      value={bullet.value}
                      onChange={(e) => updateBullet(exp.id, bullet.id, 'value', e.target.value)}
                      rows={2}
                      className="flex-1 rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm resize-y"
                      placeholder={`Achievement ${bulletIndex + 1}...`}
                    />
                    {exp.bullets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBullet(exp.id, bullet.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-neutral-800 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition mt-1"
                        title="Remove bullet"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => addBullet(exp.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm font-medium transition"
                >
                  <Plus className="h-4 w-4" />
                  Add achievement
                </button>
              </div>
            </div>
          </div>
        ))}

        {experience.length === 0 && (
          <p className="text-sm text-neutral-500 italic text-center py-4">
            No work experience added yet. Click below to add your first role.
          </p>
        )}

        <button
          type="button"
          onClick={addExperience}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 px-4 py-3 text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Add work experience
        </button>
      </div>
    </SectionWrapper>
  )
}
