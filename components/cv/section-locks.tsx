"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Lock, LockOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionLocksProps {
  availableSections: string[];
  lockedSections: string[];
  onLocksChange: (sections: string[]) => void;
  immutableSections?: string[];
}

export function SectionLocks({
  availableSections,
  lockedSections,
  onLocksChange,
  immutableSections = ["Education", "Certifications"],
}: SectionLocksProps) {
  const toggleSection = (section: string) => {
    if (immutableSections.includes(section)) return; // Can't toggle immutable sections

    if (lockedSections.includes(section)) {
      onLocksChange(lockedSections.filter((s) => s !== section));
    } else {
      onLocksChange([...lockedSections, section]);
    }
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Lock className="h-5 w-5 text-blue-400" />
          Section Locks
        </CardTitle>
        <CardDescription className="text-white/60">
          Lock sections to preserve them exactly as they appear in your master resume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {availableSections.map((section) => {
            const isImmutable = immutableSections.includes(section);
            const isLocked = lockedSections.includes(section) || isImmutable;

            return (
              <div
                key={section}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isLocked
                    ? "bg-blue-500/10 border-blue-400/30"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                  isImmutable && "opacity-75"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isLocked}
                    onCheckedChange={() => toggleSection(section)}
                    disabled={isImmutable}
                    className={cn(
                      "border-white/30",
                      isLocked && "border-blue-400 bg-blue-500/20"
                    )}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{section}</span>
                      {isImmutable && (
                        <Badge
                          variant="outline"
                          className="text-xs border-amber-400/40 text-amber-200 bg-amber-500/10"
                        >
                          Always locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {isLocked
                        ? "Will be copied unchanged from master resume"
                        : "Will be optimized for target job"}
                    </p>
                  </div>
                </div>
                <div className="text-white/40">
                  {isLocked ? (
                    <Lock className="h-4 w-4 text-blue-400" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info section */}
        <div className="flex gap-2 p-3 bg-blue-500/5 border border-blue-400/20 rounded-lg">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-white/70 space-y-1">
            <p>
              <strong className="text-white">Locked sections</strong> are copied exactly from your
              master resume without any AI modifications.
            </p>
            <p>
              <strong className="text-white">Unlocked sections</strong> are optimized for the
              target job (reordering, keyword integration, relevance scoring).
            </p>
            <p className="text-amber-300/80">
              ⚠️ Education and Certifications are always locked to ensure accuracy.
            </p>
          </div>
        </div>

        {/* Lock summary */}
        {lockedSections.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <span className="text-sm text-white/70">
              {lockedSections.length} custom{" "}
              {lockedSections.length === 1 ? "section" : "sections"} locked
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
