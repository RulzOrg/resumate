"use client"

import Link from "next/link"
import { Wand2, Code2, Server, Database, FileCog, Files, Clock, Check, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Application {
  id: string
  title: string
  job_title: string
  company_name: string | null
  variant_name: string
  status: string
  created_at: string
  match_score: number | null
}

interface ApplicationsTableProps {
  applications: Application[]
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Loader2,
    className: "border-white/20 bg-white/10 text-white/80",
    iconClassName: "animate-spin",
  },
  in_review: {
    label: "In review",
    icon: Clock,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    iconClassName: "",
  },
  interview: {
    label: "Interview",
    icon: Check,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    iconClassName: "",
  },
}

const getJobIcon = (jobTitle: string) => {
  const title = jobTitle.toLowerCase()
  if (title.includes("frontend") || title.includes("front-end")) return Code2
  if (title.includes("devops")) return Server
  if (title.includes("data") || title.includes("analyst")) return Database
  return Code2
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-white/60">
          <tr className="border-b border-white/10">
            <th className="text-left font-medium py-3 px-4">Role</th>
            <th className="text-left font-medium py-3 px-4">Company</th>
            <th className="text-left font-medium py-3 px-4">Status</th>
            <th className="text-left font-medium py-3 px-4">Applied</th>
            <th className="text-left font-medium py-3 px-4">Match</th>
            <th className="text-right font-medium py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, idx) => {
            const JobIcon = getJobIcon(app.job_title)
            const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending
            const StatusIcon = status.icon
            
            return (
              <tr
                key={app.id}
                className={`hover:bg-white/[0.04] ${
                  idx < applications.length - 1 ? "border-b border-white/10" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <JobIcon className="w-4 h-4 text-white/60" />
                      <span className="font-geist text-white/90">{app.job_title}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 w-fit rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                      <FileCog className="w-3 h-3" />
                      Variant: {app.variant_name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-white/80">{app.company_name || "Company"}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    <StatusIcon className={`w-3 h-3 ${status.iconClassName}`} />
                    {status.label}
                  </span>
                </td>
                <td className="py-3 px-4 text-white/70">
                  {formatDistanceToNow(new Date(app.created_at), { addSuffix: false })} ago
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${app.match_score || 0}%` }}
                      />
                    </div>
                    <span className="text-white/80">{app.match_score || 0}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/dashboard/optimized/${app.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Tailor
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
