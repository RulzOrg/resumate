"use client"

import Link from "next/link"
import { Wand2, Code2, Server, Database, FileCog, Files, Clock, Check, Loader2 } from "lucide-react"
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
    <>
      {/* Desktop Table */}
      <ResponsiveTable>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10">
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Match</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {applications.map((app, idx) => {
            const JobIcon = getJobIcon(app.job_title)
            const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending
            const StatusIcon = status.icon
            
            return (
              <TableRow key={app.id}>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-white/80">{app.company_name || "Company"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    <StatusIcon className={`w-3 h-3 ${status.iconClassName}`} />
                    {status.label}
                  </span>
                </TableCell>
                <TableCell className="text-white/70">
                  {formatDistanceToNow(new Date(app.created_at), { addSuffix: false })} ago
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${app.match_score || 0}%` }}
                      />
                    </div>
                    <span className="text-white/80">{app.match_score || 0}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/optimized/${app.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Tailor
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
          </TableBody>
        </Table>
      </ResponsiveTable>

      {/* Mobile Card View */}
      <MobileCardList>
        {applications.map((app) => {
          const JobIcon = getJobIcon(app.job_title)
          const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending
          const StatusIcon = status.icon
          
          return (
            <MobileCard key={app.id}>
              {/* Role & Variant */}
              <div className="flex items-start gap-2 pb-3 border-b border-white/10">
                <JobIcon className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-geist text-white/90 font-medium">{app.job_title}</h3>
                  <p className="text-sm text-white/60 mt-0.5">{app.company_name || "Company"}</p>
                  <span className="inline-flex items-center gap-1 mt-2 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                    <FileCog className="w-3 h-3" />
                    Variant: {app.variant_name}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <MobileCardRow label="Status">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    <StatusIcon className={`w-3 h-3 ${status.iconClassName}`} />
                    {status.label}
                  </span>
                </MobileCardRow>

                <MobileCardRow label="Applied">
                  {formatDistanceToNow(new Date(app.created_at), { addSuffix: false })} ago
                </MobileCardRow>

                <MobileCardRow label="Match">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${app.match_score || 0}%` }}
                      />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{app.match_score || 0}%</span>
                  </div>
                </MobileCardRow>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-white/10">
                <Link
                  href={`/dashboard/optimized/${app.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition"
                >
                  <Wand2 className="w-4 h-4" />
                  Tailor Resume
                </Link>
              </div>
            </MobileCard>
          )
        })}
      </MobileCardList>
    </>
  )
}
