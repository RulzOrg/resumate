"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MustHitKeywordsProps {
  suggestedKeywords: string[];
  selectedKeywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  maxKeywords?: number;
}

export function MustHitKeywords({
  suggestedKeywords,
  selectedKeywords,
  onKeywordsChange,
  maxKeywords = 12,
}: MustHitKeywordsProps) {
  const [customKeyword, setCustomKeyword] = useState("");

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) return;
    if (selectedKeywords.includes(trimmed)) return;
    if (selectedKeywords.length >= maxKeywords) return;

    onKeywordsChange([...selectedKeywords, trimmed]);
    setCustomKeyword("");
  };

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(selectedKeywords.filter((k) => k !== keyword));
  };

  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      removeKeyword(keyword);
    } else {
      addKeyword(keyword);
    }
  };

  const unselectedSuggestions = suggestedKeywords.filter(
    (k) => !selectedKeywords.includes(k.toLowerCase())
  );

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="h-5 w-5 text-emerald-400" />
          Must-Hit Keywords
        </CardTitle>
        <CardDescription className="text-white/60">
          These keywords will appear verbatim in your generated CV. Select up to {maxKeywords} critical terms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected keywords */}
        {selectedKeywords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-200">
                Selected ({selectedKeywords.length}/{maxKeywords})
              </span>
              {selectedKeywords.length >= maxKeywords && (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Maximum reached
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30 cursor-pointer group"
                  onClick={() => removeKeyword(keyword)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {keyword}
                  <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add custom keyword */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Add Custom Keyword</label>
          <div className="flex gap-2">
            <Input
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword(customKeyword);
                }
              }}
              placeholder="e.g., React, AWS, Agile..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              disabled={selectedKeywords.length >= maxKeywords}
            />
            <Button
              onClick={() => addKeyword(customKeyword)}
              disabled={!customKeyword.trim() || selectedKeywords.length >= maxKeywords}
              size="icon"
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Suggested keywords */}
        {unselectedSuggestions.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">
                Suggested from Job Description
              </span>
              <span className="text-xs text-white/50">Click to add</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unselectedSuggestions.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className={cn(
                    "border-white/20 text-white/70 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-400/40 cursor-pointer transition-all",
                    selectedKeywords.length >= maxKeywords && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (selectedKeywords.length < maxKeywords) {
                      toggleKeyword(keyword);
                    }
                  }}
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Info message */}
        <div className="text-xs text-white/50 pt-2 border-t border-white/10">
          <p>
            💡 Must-hit keywords will be naturally integrated into your summary, skills, or
            relevant bullet points. They're critical for ATS (Applicant Tracking Systems).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
