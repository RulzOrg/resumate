"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Circle, 
  FileText, 
  Download, 
  Eye,
  Zap,
  Shield,
  Target,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CvVariant } from "@/lib/schemas.generate";

interface VariantSelectorProps {
  variants: CvVariant[];
  selectedVariantId?: string;
  onVariantSelect: (variantId: string) => void;
  onExport?: (variantId: string, format: "docx" | "pdf") => void;
  onPreview?: (variantId: string) => void;
}

const variantInfo = {
  Conservative: {
    icon: Shield,
    color: "blue",
    description: "Minimal changes, stays close to your original phrasing",
    bestFor: "When you want to keep your authentic voice",
  },
  Balanced: {
    icon: Target,
    color: "emerald",
    description: "Moderate optimization blending your content with job keywords",
    bestFor: "Most users - balanced approach (Recommended)",
  },
  Bold: {
    icon: Zap,
    color: "purple",
    description: "Maximum impact with strong action verbs and ATS optimization",
    bestFor: "Competitive roles where you want to stand out",
  },
  Default: {
       icon: FileText,
       color: "gray",
       description: "Custom variant",
       bestFor: "Custom use case",
     },
};

export function VariantSelector({
  variants,
  selectedVariantId,
  onVariantSelect,
  onExport,
  onPreview,
}: VariantSelectorProps) {
  const [activeTab, setActiveTab] = useState<string>(
    selectedVariantId || variants.find((v) => v.is_selected)?.variant_id || variants[0]?.variant_id || ""
  );

  const activeVariant = variants.find((v) => v.variant_id === activeTab);

  if (variants.length === 0) {
    return (
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardContent className="p-6 text-center text-white/60">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No variants generated yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white">Choose Your CV Variant</CardTitle>
        <CardDescription className="text-white/60">
          Select the version that best matches your needs. All variants are grounded in your
          experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variant tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            {variants.map((variant) => {
              const info = variantInfo[variant.label];
              const Icon = info.icon;
              const isSelected = variant.variant_id === selectedVariantId;

              return (
                <TabsTrigger
                  key={variant.variant_id}
                  value={variant.variant_id}
                  className={cn(
                    "relative data-[state=active]:bg-white/10",
                    isSelected && "data-[state=active]:ring-2 data-[state=active]:ring-emerald-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", `text-${info.color}-400`)} />
                    <span>{variant.label}</span>
                    {isSelected && (
                      <CheckCircle className="h-3 w-3 text-emerald-400 absolute -top-1 -right-1" />
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {variants.map((variant) => {
            const info = variantInfo[variant.label];
                <div className={cn(
                  "p-4 rounded-lg border",
                  info.color === "blue" && "bg-blue-500/10 border-blue-400/30",
                  info.color === "emerald" && "bg-emerald-500/10 border-emerald-400/30",
                  info.color === "purple" && "bg-purple-500/10 border-purple-400/30"
                )}>
                  <div className="flex items-start gap-3">
                    <Icon className={cn(
                      "h-5 w-5 mt-0.5",
                      info.color === "blue" && "text-blue-400",
                      info.color === "emerald" && "text-emerald-400",
                      info.color === "purple" && "text-purple-400"
                    )} />
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-semibold mb-1",
                        info.color === "blue" && "text-blue-200",
                        info.color === "emerald" && "text-emerald-200",
                        info.color === "purple" && "text-purple-200"
                      )}>
                        {variant.label} Variant
                      </h3>
                      <p className="text-sm text-white/70 mb-2">{info.description}</p>
                      <p className="text-xs text-white/50">
                        <strong>Best for:</strong> {info.bestFor}
                      </p>
                    </div>
                  </div>
                </div>
                      <p className="text-xs text-white/50">
                        <strong>Best for:</strong> {info.bestFor}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Preview</label>
                  <ScrollArea className="h-[200px] rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                        {variant.draft.summary || "No summary available"}
                      </p>
                      
                      {variant.draft.skills && variant.draft.skills.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-white text-sm font-semibold mb-2">Top Skills:</h4>
                          <div className="flex flex-wrap gap-1">
                            {variant.draft.skills.slice(0, 8).map((skill, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="bg-white/10 text-white/70 border-white/20 text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {variant.draft.skills.length > 8 && (
                              <Badge
                                variant="secondary"
                                className="bg-white/10 text-white/50 border-white/20 text-xs"
                              >
                                +{variant.draft.skills.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-white/50 mb-1">Experiences</div>
                    <div className="text-lg font-semibold text-white">
                      {variant.draft.experiences?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-white/50 mb-1">Skills</div>
                    <div className="text-lg font-semibold text-white">
                      {variant.draft.skills?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-xs text-white/50 mb-1">Pages</div>
                    <div className="text-lg font-semibold text-white">
                      {variant.draft.length_estimate?.pages || "~2"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!isSelected ? (
                    <Button
                      onClick={() => onVariantSelect(variant.variant_id)}
                      className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Select This Variant
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-200">Selected</span>
                    </div>
                  )}
                  
                  {onPreview && (
                    <Button
                      onClick={() => onPreview(variant.variant_id)}
                      variant="outline"
                      className="border-white/20 hover:bg-white/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  )}
                </div>

                {isSelected && onExport && (
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Button
                      onClick={() => onExport(variant.variant_id, "docx")}
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export DOCX
                    </Button>
                    <Button
                      onClick={() => onExport(variant.variant_id, "pdf")}
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
