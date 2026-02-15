"use client"

import { formatContactString } from "@/lib/resume-parser"
import { stripMarkdown } from "./utils/markdown"
import type { ResumePreviewProps } from "./types"

export function ResumePreview({ parsed, rawContent }: ResumePreviewProps) {
  // Check if content is essentially empty
  const isEmpty = !parsed.contact.name &&
                  !parsed.summary &&
                  parsed.workExperience.length === 0 &&
                  parsed.skills.length === 0

  if (isEmpty && rawContent) {
    // Show raw content as fallback if parsing failed
    return (
      <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 min-h-[900px] text-gray-900">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Resume parsing encountered issues. Showing raw content below.
          </p>
        </div>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {rawContent}
        </pre>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 min-h-[900px] text-gray-900 font-['Georgia',serif]">
      {/* Header */}
      <div className="mb-5 border-b-2 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary tracking-wide">
          {parsed.contact.name || "Your Name"}
        </h1>

        {/* Contact Info Line */}
        <p className="text-xs text-gray-600 mt-1.5 tracking-wide">
          {formatContactString(parsed.contact)}
        </p>
      </div>

      {/* Target Title */}
      {parsed.targetTitle && (
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            {parsed.targetTitle}
          </h2>
        </div>
      )}

      {/* Professional Summary */}
      {parsed.summary && (
        <div className="mb-5">
          <p className="text-xs text-gray-700 leading-relaxed">
            {stripMarkdown(parsed.summary)}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {parsed.workExperience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
            Work Experience
          </h2>

          {parsed.workExperience.map((exp, idx) => (
            <div key={idx} className="mb-4 last:mb-0">
              <div className="flex justify-between items-start mb-0.5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{exp.company}</h3>
                  <p className="text-xs text-gray-700">
                    {exp.title}
                    {exp.employmentType && ` \u00b7 ${exp.employmentType}`}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>
                    {exp.startDate && exp.endDate
                      ? `${exp.startDate} - ${exp.endDate}`
                      : ""}
                  </p>
                  {exp.location && <p>{exp.location}</p>}
                </div>
              </div>

              {exp.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {exp.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-xs text-gray-700 pl-3 relative before:content-['\2022'] before:absolute before:left-0 before:text-gray-400"
                    >
                      {stripMarkdown(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {parsed.education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">
            Education
          </h2>

          {parsed.education.map((edu, idx) => (
            <div key={idx} className="mb-2 last:mb-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {edu.institution}
                  </h3>
                  {edu.degree && (
                    <p className="text-xs text-gray-700">{edu.degree}</p>
                  )}
                  {edu.field && (
                    <p className="text-xs text-gray-600">{edu.field}</p>
                  )}
                </div>
                {edu.graduationDate && (
                  <p className="text-xs text-gray-600">{edu.graduationDate}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {parsed.skills.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Skills
          </h2>
          <p className="text-xs text-gray-700">
            {parsed.skills.map(s => stripMarkdown(s)).join(" \u00b7 ")}
          </p>
        </div>
      )}

      {/* Certifications */}
      {parsed.certifications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Certifications
          </h2>
          <ul className="space-y-0.5">
            {parsed.certifications.map((cert, idx) => (
              <li key={idx} className="text-xs text-gray-700">
                {stripMarkdown(cert.name)}
                {cert.issuer && (
                  <span className="text-gray-500"> — {stripMarkdown(cert.issuer)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects */}
      {parsed.projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Projects
          </h2>
          {parsed.projects.map((project, idx) => (
            <div key={idx} className="mb-2 last:mb-0">
              <h3 className="text-sm font-bold text-gray-900">{stripMarkdown(project.name)}</h3>
              {project.description && (
                <p className="text-xs text-gray-600">{stripMarkdown(project.description)}</p>
              )}
              {project.bullets.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {project.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-xs text-gray-700 pl-3 relative before:content-['\2022'] before:absolute before:left-0 before:text-gray-400"
                    >
                      {stripMarkdown(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      {parsed.awards.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Awards & Scholarships
          </h2>
          <ul className="space-y-0.5">
            {parsed.awards.map((award, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-700 pl-3 relative before:content-['\2022'] before:absolute before:left-0 before:text-gray-400"
              >
                {stripMarkdown(award)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Volunteering */}
      {parsed.volunteering.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Volunteering & Leadership
          </h2>
          {parsed.volunteering.map((vol, idx) => (
            <div key={idx} className="mb-1.5 last:mb-0">
              <h3 className="text-sm font-bold text-gray-900">
                {vol.organization}
              </h3>
              {vol.role && <p className="text-xs text-gray-700">{vol.role}</p>}
              {vol.dates && <p className="text-xs text-gray-500">{vol.dates}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Publications */}
      {parsed.publications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Publications
          </h2>
          <ul className="space-y-0.5">
            {parsed.publications.map((pub, idx) => (
              <li key={idx} className="text-xs text-gray-700">
                {stripMarkdown(pub.title)}
                {pub.publisher && (
                  <span className="text-gray-500"> — {stripMarkdown(pub.publisher)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interests */}
      {parsed.interests.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">
            Interests
          </h2>
          <p className="text-xs text-gray-700">{parsed.interests.map(i => stripMarkdown(i)).join(" \u00b7 ")}</p>
        </div>
      )}
    </div>
  )
}
