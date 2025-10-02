"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Lightbulb, 
  Loader2,
  RefreshCw,
  TrendingUp
} from "lucide-react";

interface EligibilityGateProps {
  jobAnalysisId: string;
  resumeId: string;
  onEligible: () => void;
  onBlocked?: () => void;
}

interface EligibilityResult {
  allowed: boolean;
  score?: number;
  must_have_coverage?: number;
  min_score_needed?: number;
  reasons?: string[];
  guidance?: string[];
  missing_must_haves?: string[];
  message?: string;
  covered_must_haves?: number;
  total_must_haves?: number;
}

export function EligibilityGate({ 
  jobAnalysisId, 
  resumeId, 
  onEligible,
  onBlocked 
}: EligibilityGateProps) {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkEligibility() {
    setChecking(true);
    setError(null);
    
    try {
      const res = await fetch("/api/cv/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_analysis_id: jobAnalysisId,
          resume_id: resumeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to check eligibility");
        return;
      }

      setResult(data);
      
      if (data.allowed) {
        onEligible();
      } else if (onBlocked) {
        onBlocked();
      }
    } catch (err: any) {
      console.error("Eligibility check failed:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkEligibility();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (checking) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <div>
              <p className="text-white font-medium">Checking qualification...</p>
              <p className="text-sm text-white/60">Analyzing resume fit for this role</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert className="border-red-500/30 bg-red-500/10">
        <XCircle className="h-5 w-5 text-red-400" />
        <AlertTitle className="text-red-200">Error</AlertTitle>
        <AlertDescription className="text-red-300/80">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkEligibility}
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  // Success state - User is eligible
  if (result.allowed) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10 backdrop-blur">
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        <AlertTitle className="text-emerald-200 font-semibold">
          Ready to Generate!
        </AlertTitle>
        <AlertDescription className="text-emerald-300/90 mt-2">
          <p className="mb-3">{result.message}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
              <TrendingUp className="h-3 w-3 mr-1" />
              Match: {result.score}%
            </Badge>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Skills: {result.must_have_coverage}%
            </Badge>
            {result.covered_must_haves !== undefined && result.total_must_haves !== undefined && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
                {result.covered_must_haves}/{result.total_must_haves} required skills
              </Badge>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Blocked state - User is not eligible
  return (
    <Card className="border-amber-500/30 bg-amber-500/10 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Not Qualified Yet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current scores */}
        <div className="flex flex-wrap gap-2">
          {result.score !== undefined && (
            <Badge 
              variant="outline" 
              className="border-amber-400/40 text-amber-200 bg-amber-500/5"
            >
              Match Score: {result.score}%
              {result.min_score_needed !== undefined && result.min_score_needed > 0 && (
                <span className="ml-1 text-amber-300/70">
                  (need +{result.min_score_needed}%)
                </span>
              )}
            </Badge>
          )}
          {result.must_have_coverage !== undefined && (
            <Badge 
              variant="outline" 
              className="border-amber-400/40 text-amber-200 bg-amber-500/5"
            >
              Skills Coverage: {result.must_have_coverage}%
            </Badge>
          )}
        </div>

        {/* Reasons */}
        {result.reasons && result.reasons.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-200 mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Issues Found:
            </h4>
            <ul className="space-y-1.5">
              {result.reasons.map((reason: string, i: number) => (
                <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2 pl-1">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing must-have skills */}
        {result.missing_must_haves && result.missing_must_haves.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-200 mb-2">
              Missing Required Skills:
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.missing_must_haves.map((skill: string, i: number) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="border-red-400/40 text-red-200 bg-red-500/10"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Guidance */}
        {result.guidance && result.guidance.length > 0 && (
          <div className="pt-3 border-t border-amber-400/20">
            <h4 className="text-sm font-medium text-emerald-200 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              How to Improve:
            </h4>
            <ul className="space-y-2.5">
              {result.guidance.map((tip: string, i: number) => (
                <li key={i} className="text-sm text-white/80 flex items-start gap-2 pl-1">
                  <span className="text-emerald-400 mt-1 font-bold">→</span>
                  <span className="flex-1">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-amber-400/20">
          <span className="text-sm text-amber-300/70">
            {result.min_score_needed !== undefined && result.min_score_needed > 0 
              ? `${result.min_score_needed}% away from qualifying`
              : "Update your resume to meet requirements"
            }
          </span>
          <Button 
            variant="outline" 
            onClick={checkEligibility}
            className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recheck
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
