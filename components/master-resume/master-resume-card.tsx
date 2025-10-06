"use client"

import { useState } from 'react'
import { ExternalLink, Download, Copy, Trash2, CheckCircle2, PenSquare } from 'lucide-react'
import type { Resume } from '@/lib/db'
import {
  getWordCount,
  getPageCount,
  extractSkills,
  calculateATSScore,
  getATSScoreColor,
  getATSScoreBarColor,
  formatRelativeTime,
  formatLastExport,
  getResumeSummary
} from '@/lib/master-resume-utils'

interface MasterResumeCardProps {
  resume: Resume
  onDelete: (id: string) => void
  onDuplicate: (id: string, title: string) => void
  onExport: (id: string) => void
}

export function MasterResumeCard({
  resume,
  onDelete,
  onDuplicate,
  onExport
}: MasterResumeCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculate metadata
  const wordCount = getWordCount(resume.content_text)
  const pageCount = getPageCount(wordCount)
  const skills = extractSkills(resume.content_text, resume.parsed_sections)
  const atsScore = calculateATSScore(resume.content_text, skills)
  const summary = getResumeSummary(resume.content_text, resume.parsed_sections)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(resume.id)
    setIsDeleting(false)
    setShowDeleteConfirm(false)
  }

  const handleDuplicate = () => {
    const newTitle = `${resume.title} — Copy`
    onDuplicate(resume.id, newTitle)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary/Duplicate/Variant Badge */}
          {resume.is_primary ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] text-emerald-200 font-geist">Primary</span>
            </span>
          ) : resume.kind === 'duplicate' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              <span className="text-[11px] text-blue-200 font-geist">Duplicate</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40"></span>
              <span className="text-[11px] text-white/60 font-geist">Variant</span>
            </span>
          )}
          <h4 className="text-sm font-medium tracking-tight font-geist">{resume.title}</h4>
          <span className="text-[11px] text-white/40 font-geist">
            Updated {formatRelativeTime(resume.updated_at)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => alert('Edit inline feature coming soon!')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10 transition"
          >
            <PenSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Edit inline</span>
          </button>
          <a
            href={`/dashboard/resumes/${resume.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-black text-sm font-medium px-3 py-1.5 hover:bg-emerald-400 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open editor</span>
          </a>
          <button
            onClick={() => onExport(resume.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10 transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Left: Summary and Skills */}
          <div className="sm:col-span-2 space-y-3">
            <p className="text-sm text-white/70 font-geist line-clamp-3">{summary}</p>

            {/* Skills Tags */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-[11px] rounded-full border border-white/10 bg-white/5 text-white/80 font-geist"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* ATS Score */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white/90 font-geist">ATS score</span>
                </div>
                <span className={`text-sm font-geist ${getATSScoreColor(atsScore)}`}>
                  {atsScore}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getATSScoreBarColor(atsScore)}`}
                  style={{ width: `${atsScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Right: Stats and Actions */}
          <div className="space-y-3">
            {/* Stats Card */}
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/60 font-geist">Pages</span>
                <span className="text-sm text-white/90 font-geist">{pageCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-white/60 font-geist">Words</span>
                <span className="text-sm text-white/90 font-geist">{wordCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-white/60 font-geist">Last updated</span>
                <span className="text-sm text-white/90 font-geist">
                  {formatLastExport(resume.updated_at)}
                </span>
              </div>
            </div>

            {/* Duplicate and Delete Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicate}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm hover:bg-white/10 transition"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition"
              >
                <Trash2 className="w-4 h-4 text-white/70 hover:text-red-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-100 font-geist">
              Delete "{resume.title}"? This action cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-full bg-red-500 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-red-400 disabled:opacity-50 font-geist"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full border border-white/20 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white font-geist"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
