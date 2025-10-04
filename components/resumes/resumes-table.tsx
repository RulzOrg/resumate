"use client"

import { FileDown } from "lucide-react"
import { getResumeIcon, getMatchScoreColor } from "@/lib/resume-utils"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveTable,
  MobileCardList,
  MobileCard,
  MobileCardRow,
} from "@/components/ui/responsive-table"

interface Resume {
  id: string
  title: string
  job_title: string
  company_name: string
  created_at: string
  match_score: number
  original_resume_title: string
}

interface ResumesTableProps {
  resumes: Resume[]
}

export function ResumesTable({ resumes }: ResumesTableProps) {
  const handleEdit = (resumeId: string) => {
    // TODO: Navigate to resume editor or open edit dialog
    console.log("Edit resume:", resumeId)
  }

  const handleExport = async (resumeId: string) => {
    // TODO: Call API to export PDF
    console.log("Export resume:", resumeId)
    // Placeholder: In production, this would trigger PDF generation
    // const response = await fetch(`/api/resumes/${resumeId}/export`, { method: 'POST' })
  }

  if (resumes.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/60 text-sm font-geist">
          No resumes generated yet. Create your first optimized resume!
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10">
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Edit</TableHead>
              <TableHead className="text-right">Export</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {resumes.map((resume, idx) => {
            const ResumeIcon = getResumeIcon(resume.job_title)
            const matchColor = getMatchScoreColor(resume.match_score)
            
            return (
              <TableRow key={resume.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ResumeIcon className="w-4 h-4 text-white/60" />
                    <span className="font-geist text-white/90">{resume.job_title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-white/80">
                  {resume.company_name}
                </TableCell>
                <TableCell className="text-white/70">
                  {formatDistanceToNow(new Date(resume.created_at), { addSuffix: false })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${matchColor}`}
                        style={{ width: `${resume.match_score}%` }}
                      />
                    </div>
                    <span className="text-white/80">{resume.match_score}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleEdit(resume.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/90 hover:text-white hover:bg-white/10 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[14px] h-[14px]"
                    >
                      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                    </svg>
                    Edit Resume
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => handleExport(resume.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-black px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-400 transition"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                </TableCell>
              </TableRow>
            )
          })}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {/* Mobile Card View */}
      <MobileCardList>
        {resumes.map((resume) => {
          const ResumeIcon = getResumeIcon(resume.job_title)
          const matchColor = getMatchScoreColor(resume.match_score)
          
          return (
            <MobileCard key={resume.id}>
              {/* Job Title & Company */}
              <div className="flex items-start gap-2 pb-3 border-b border-white/10">
                <ResumeIcon className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-geist text-white/90 font-medium">{resume.job_title}</h3>
                  <p className="text-sm text-white/60 mt-0.5">{resume.company_name}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <MobileCardRow label="Added">
                  {formatDistanceToNow(new Date(resume.created_at), { addSuffix: false })}
                </MobileCardRow>

                <MobileCardRow label="Score">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full ${matchColor}`}
                        style={{ width: `${resume.match_score}%` }}
                      />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{resume.match_score}%</span>
                  </div>
                </MobileCardRow>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => handleEdit(resume.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-[14px] h-[14px]"
                  >
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleExport(resume.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-black px-3 py-2 text-sm font-medium hover:bg-emerald-400 transition"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </MobileCard>
          )
        })}
      </MobileCardList>
    </>
  )
}
