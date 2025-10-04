"use client"

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from './editor-provider'

export function PreviewPanel() {
  const { state, getIncludedCount } = useEditor()
  const [copied, setCopied] = useState(false)
  
  const includedCount = getIncludedCount()

  const handleCopy = async () => {
    const previewElement = document.getElementById('preview-content')
    if (!previewElement) return

    try {
      await navigator.clipboard.writeText(previewElement.innerText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Generate preview content
  const fullName = [
    state.contact.firstName.include ? state.contact.firstName.value : '',
    state.contact.lastName.include ? state.contact.lastName.value : ''
  ].filter(Boolean).join(' ')

  const contactDetails = [
    state.contact.email.include ? state.contact.email.value : '',
    state.contact.phone.include ? state.contact.phone.value : '',
    state.contact.linkedin.include ? state.contact.linkedin.value : '',
    state.contact.location.include ? state.contact.location.value : ''
  ].filter(Boolean).join(' • ')

  const includedSummaries = (state.summaries || []).filter(s => s && s.include && s.value)

  return (
    <aside className="space-y-4">
      {/* Preview Card */}
      <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/40">
        {/* Header Image */}
        <div className="h-28 w-full bg-gradient-to-br from-neutral-800 to-neutral-900 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900/60"></div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl tracking-tight font-semibold">Variant Preview</h3>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium transition"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Preview Content */}
          <div id="preview-content" className="mt-4 space-y-4 text-sm leading-6 text-neutral-200">
            {/* Name */}
            {fullName && (
              <div className="text-lg font-semibold tracking-tight">{fullName}</div>
            )}

            {/* Title */}
            {state.targetTitle.include && state.targetTitle.value && (
              <div className="text-neutral-300">{state.targetTitle.value}</div>
            )}

            {/* Contact Details */}
            {contactDetails && (
              <div className="text-xs text-neutral-400">{contactDetails}</div>
            )}

            {/* Professional Summary */}
            {includedSummaries.length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Professional Summary
                </div>
                {includedSummaries.map(summary => (
                  <p key={summary.id} className="text-sm text-neutral-200">
                    {summary.value}
                  </p>
                ))}
              </>
            )}

            {/* Work Experience */}
            {(state.experience || []).filter(e => e && e.include).length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Work Experience
                </div>
                {(state.experience || []).filter(e => e && e.include).map(exp => (
                  <div key={exp.id} className="space-y-1 mt-3">
                    {exp.company && <div className="font-medium">{exp.company}</div>}
                    {exp.role && <div className="text-neutral-300 text-sm">{exp.role}</div>}
                    {exp.dates && <div className="text-xs text-neutral-500">{exp.dates}</div>}
                    {(exp.bullets || []).filter(b => b && b.include && b.value).length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        {(exp.bullets || [])
                          .filter(b => b && b.include && b.value)
                          .map(bullet => (
                            <li key={bullet.id} className="text-sm">{bullet.value}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Education */}
            {(state.education || []).filter(e => e && e.include).length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Education
                </div>
                {(state.education || []).filter(e => e && e.include).map(edu => (
                  <div key={edu.id} className="space-y-1 mt-3">
                    {edu.institution && <div className="font-medium">{edu.institution}</div>}
                    {(edu.degree || edu.field) && (
                      <div className="text-neutral-300 text-sm">
                        {[edu.degree, edu.field].filter(Boolean).join(' in ')}
                      </div>
                    )}
                    {edu.location && <div className="text-xs text-neutral-500">{edu.location}</div>}
                    {(edu.start || edu.end) && (
                      <div className="text-xs text-neutral-500">
                        {[edu.start, edu.end].filter(Boolean).join(' – ')}
                      </div>
                    )}
                    {edu.gpa && <div className="text-xs text-neutral-400">GPA: {edu.gpa}</div>}
                    {edu.notes && <div className="text-xs text-neutral-400">{edu.notes}</div>}
                  </div>
                ))}
              </>
            )}

            {/* Certifications */}
            {(state.certifications || []).filter(c => c && c.include).length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Certifications
                </div>
                {(state.certifications || []).filter(c => c && c.include).map(cert => (
                  <div key={cert.id} className="text-sm text-neutral-200 mt-2">
                    {[cert.name, cert.issuer].filter(Boolean).join(' - ')}
                    {cert.date && ` (${cert.date})`}
                  </div>
                ))}
              </>
            )}

            {/* Skills */}
            {(state.skills || []).filter(s => s && s.include).length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {(state.skills || [])
                    .filter(s => s && s.include && s.value)
                    .map(skill => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-800 text-xs"
                      >
                        {skill.value}
                      </span>
                    ))}
                </div>
              </>
            )}

            {/* Interests */}
            {(state.interests || []).filter(i => i && i.include).length > 0 && (
              <>
                <div className="pt-4 text-sm font-medium text-neutral-300">
                  Interests
                </div>
                <div className="text-sm text-neutral-200">
                  {(state.interests || [])
                    .filter(i => i && i.include && i.value)
                    .map(i => i.value)
                    .join(', ')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Included Parts Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Included parts</h4>
          <span className="text-xs text-neutral-400">{includedCount} selected</span>
        </div>
        <p className="text-xs text-neutral-400">
          Use the checkboxes in the editor to include or exclude any field, summary, or bullet from this variant.
        </p>
      </div>
    </aside>
  )
}
