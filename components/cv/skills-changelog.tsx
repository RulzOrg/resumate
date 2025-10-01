"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, FileText, CheckCircle } from "lucide-react";
import type { CvDraft } from "@/lib/schemas.generate";

interface SkillsChangelogProps {
  changelog: CvDraft["skills_changelog"];
  variantLabel?: "Conservative" | "Balanced" | "Bold";
}

export function SkillsChangelog({ changelog, variantLabel }: SkillsChangelogProps) {
  const addedCount = changelog.added.length;
  const removedCount = changelog.removed.length;
  const totalChanges = addedCount + removedCount;

  if (totalChanges === 0) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-blue-400" />
            Skills Changes
            {variantLabel && (
              <Badge variant="outline" className="border-white/20 text-white/70">
                {variantLabel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-white/60">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm">No skill changes for this variant</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="h-5 w-5 text-blue-400" />
          Skills Changes
          {variantLabel && (
            <Badge variant="outline" className="border-white/20 text-white/70">
              {variantLabel}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-white/60">
          {totalChanges} change{totalChanges === 1 ? "" : "s"} to optimize for target role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {/* Added skills */}
            {addedCount > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-200">
                    Added ({addedCount})
                  </span>
                </div>
                <div className="space-y-2">
                  {changelog.added.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-emerald-500/10 border border-emerald-400/20 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 mt-0.5"
                        >
                          {item.skill}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 mt-2 pl-0.5">
                        <span className="text-white/40">Reason:</span> {item.justification}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed skills */}
            {removedCount > 0 && (
              <div className={addedCount > 0 ? "pt-2 border-t border-white/10" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  <Minus className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-200">
                    Removed ({removedCount})
                  </span>
                </div>
                <div className="space-y-2">
                  {changelog.removed.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 bg-red-500/10 border border-red-400/20 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-red-500/20 text-red-200 border-red-400/40 line-through mt-0.5"
                        >
                          {item.skill}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 mt-2 pl-0.5">
                        <span className="text-white/40">Reason:</span> {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-white/50">
          <span>All changes are evidence-based and grounded in your resume</span>
          <span>
            {addedCount > 0 && `+${addedCount}`}
            {addedCount > 0 && removedCount > 0 && " / "}
            {removedCount > 0 && `-${removedCount}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
