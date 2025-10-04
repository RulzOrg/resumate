"use client"

import { Check, Plus, X } from 'lucide-react'
import { useEditor } from '../editor-provider'
import { SectionWrapper } from '../section-wrapper'

export function EducationSection() {
  const { 
    state, 
    updateEducation, 
    addEducation, 
    removeEducation,
    updateCertification,
    addCertification,
    removeCertification
  } = useEditor()
  const { education, certifications } = state

  return (
    <div className="space-y-6">
      {/* Education Section */}
      <SectionWrapper title="Education">
        <div className="space-y-4">
          {education.map((edu, eduIndex) => (
            <div 
              key={edu.id} 
              className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4"
            >
              {/* Education Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <label className="relative inline-flex items-center cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={edu.include}
                      onChange={(e) => updateEducation(edu.id, { include: e.target.checked })}
                      className="peer sr-only"
                    />
                    <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                      <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                    </span>
                  </label>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-neutral-400">Education {eduIndex + 1}</span>
                  </div>
                </div>
                
                {education.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEducation(edu.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-xs font-medium transition"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>

              {/* Institution */}
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Institution</label>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                  placeholder="e.g. Stanford University"
                />
              </div>

              {/* Degree & Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Degree</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. Bachelor of Science"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Field of Study</label>
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              {/* Location & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={edu.location}
                    onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. Stanford, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Start Date</label>
                  <input
                    type="text"
                    value={edu.start}
                    onChange={(e) => updateEducation(edu.id, { start: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. 2016"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">End Date</label>
                  <input
                    type="text"
                    value={edu.end}
                    onChange={(e) => updateEducation(edu.id, { end: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. 2020"
                  />
                </div>
              </div>

              {/* GPA & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">GPA (optional)</label>
                  <input
                    type="text"
                    value={edu.gpa || ''}
                    onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. 3.8/4.0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={edu.notes || ''}
                    onChange={(e) => updateEducation(edu.id, { notes: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. Summa Cum Laude"
                  />
                </div>
              </div>
            </div>
          ))}

          {education.length === 0 && (
            <p className="text-sm text-neutral-500 italic text-center py-4">
              No education added yet. Click below to add your education.
            </p>
          )}

          <button
            type="button"
            onClick={addEducation}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 px-4 py-3 text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Add education
          </button>
        </div>
      </SectionWrapper>

      {/* Certifications Section */}
      <SectionWrapper title="Certifications">
        <div className="space-y-4">
          {certifications.map((cert, certIndex) => (
            <div 
              key={cert.id} 
              className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-4"
            >
              {/* Certification Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <label className="relative inline-flex items-center cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={cert.include}
                      onChange={(e) => updateCertification(cert.id, { include: e.target.checked })}
                      className="peer sr-only"
                    />
                    <span className="h-5 w-5 rounded-md border border-neutral-700 bg-neutral-900 ring-1 ring-inset ring-neutral-800 flex items-center justify-center peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition">
                      <Check className="h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition" />
                    </span>
                  </label>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-neutral-400">Certification {certIndex + 1}</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => removeCertification(cert.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-xs font-medium transition"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>

              {/* Certification Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Certification Name</label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. AWS Solutions Architect"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Issuer</label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. Amazon Web Services"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300 mb-2">Date</label>
                  <input
                    type="text"
                    value={cert.date}
                    onChange={(e) => updateCertification(cert.id, { date: e.target.value })}
                    className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 px-3 py-2 text-sm"
                    placeholder="e.g. 2023"
                  />
                </div>
              </div>
            </div>
          ))}

          {certifications.length === 0 && (
            <p className="text-sm text-neutral-500 italic text-center py-4">
              No certifications added yet. Click below to add a certification.
            </p>
          )}

          <button
            type="button"
            onClick={addCertification}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 px-4 py-3 text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Add certification
          </button>
        </div>
      </SectionWrapper>
    </div>
  )
}
