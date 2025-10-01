"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { EligibilityGate } from "./eligibility-gate";
import { MustHitKeywords } from "./must-hit-keywords";
import { SectionLocks } from "./section-locks";
import { VariantSelector } from "./variant-selector";
import { SkillsChangelog } from "./skills-changelog";
import type { CvVariant } from "@/lib/schemas.generate";

interface GenerateCvWizardProps {
  jobAnalysisId: string;
  resumeId: string;
  suggestedKeywords: string[];
  availableSections: string[];
  onComplete?: (selectedVariantId: string) => void;
}

type WizardStep = "eligibility" | "options" | "generating" | "review";

export function GenerateCvWizard({
  jobAnalysisId,
  resumeId,
  suggestedKeywords,
  availableSections,
  onComplete,
}: GenerateCvWizardProps) {
  const [step, setStep] = useState<WizardStep>("eligibility");
  const [isEligible, setIsEligible] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [lockedSections, setLockedSections] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<CvVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const handleEligible = () => {
    setIsEligible(true);
  };

  const handleOptionsNext = () => {
    setStep("generating");
    generateVariants();
  };

  const generateVariants = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "current", // Will be extracted from auth in API
          jobId: jobAnalysisId,
          resumeId,
          options: {
            tone: "Impactful",
            must_hit: selectedKeywords,
            emphasis: [],
            keep_spelling: "US",
            max_pages: 2,
          },
          locks: {
            sections: lockedSections,
            bullet_ids: [],
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate variants");
      }

      if (!data.version_id) {
        throw new Error("No version ID returned from generation");
      }

      // Fetch full variants
      const versionRes = await fetch(
        `/api/cv/generate?version_id=${data.version_id}`
      );

      if (!versionRes.ok) {
        throw new Error("Failed to fetch variant details");
      }

      const versionData = await versionRes.json();

      setVariants(versionData.version.variants || []);
      setStep("review");
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate CV variants");
      setStep("options");
    } finally {
      setGenerating(false);
    }
  };

  const handleVariantSelect = async (variantId: string) => {
    try {
      const res = await fetch("/api/cv/export", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId }),
      });

      if (!res.ok) {
        throw new Error("Failed to select variant");
      }

      setSelectedVariantId(variantId);
    } catch (err: any) {
      console.error("Select error:", err);
      setError(err.message);
    }
  };

  const handleExport = async (variantId: string, format: "docx" | "pdf" | "txt") => {
    try {
      const res = await fetch("/api/cv/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, format }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to export CV");
      }

      if (format === "txt") {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cv-${format}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        // Consider replacing alert with a proper toast/modal notification
        console.log("Export response:", data);
        alert(data.message + "\n\n" + data.instructions);
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setError(err.message);
    }
  };

  // Step 1: Eligibility check
  if (step === "eligibility") {
    return (
      <div className="space-y-4">
        <EligibilityGate
          jobAnalysisId={jobAnalysisId}
          resumeId={resumeId}
          onEligible={handleEligible}
        />
        {isEligible && (
          <div className="flex justify-end">
            <Button
              onClick={() => setStep("options")}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
            >
              Continue to Options
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Options configuration
  if (step === "options") {
    return (
      <div className="space-y-4">
        <MustHitKeywords
          suggestedKeywords={suggestedKeywords}
          selectedKeywords={selectedKeywords}
          onKeywordsChange={setSelectedKeywords}
        />
        <SectionLocks
          availableSections={availableSections}
          lockedSections={lockedSections}
          onLocksChange={setLockedSections}
        />
        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4">
              <p className="text-sm text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}
        <div className="flex justify-between">
          <Button
            onClick={() => setStep("eligibility")}
            variant="outline"
            className="border-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleOptionsNext}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate 3 Variants
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Generating
  if (step === "generating") {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-emerald-400" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Generating Your CV Variants
          </h3>
          <p className="text-white/60 mb-4">
            Creating Conservative, Balanced, and Bold versions...
          </p>
          <div className="space-y-2 text-sm text-white/50">
            <p>✓ Analyzing job requirements</p>
            <p>✓ Retrieving relevant evidence</p>
            <p>✓ Optimizing for ATS systems</p>
            <p className="animate-pulse">⏳ Generating variants...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Review and select
  if (step === "review") {
    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId);

    return (
      <div className="space-y-4">
        <VariantSelector
          variants={variants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={handleVariantSelect}
          onExport={handleExport}
        />
        
        {selectedVariant && (
          <SkillsChangelog
            changelog={selectedVariant.draft.skills_changelog}
            variantLabel={selectedVariant.label}
          />
        )}

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4">
              <p className="text-sm text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            onClick={() => {
              setStep("options");
              setVariants([]);
              setSelectedVariantId(undefined);
            }}
            variant="outline"
            className="border-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
          {selectedVariantId && onComplete && (
            <Button
              onClick={() => onComplete(selectedVariantId)}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
            >
              Complete
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
