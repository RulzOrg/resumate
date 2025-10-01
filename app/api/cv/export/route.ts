import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser, getCvVariant } from "@/lib/db";
import { z } from "zod";

const exportRequestSchema = z.object({
  variant_id: z.string(),
  format: z.enum(["docx", "pdf", "txt"]),
});

/**
 * Export a CV variant to DOCX, PDF, or TXT format
 * 
 * This is a simplified implementation that returns the CV content
 * In production, you'd integrate with a library like:
 * - docx for DOCX generation
 * - puppeteer or PDFKit for PDF generation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { variant_id, format } = exportRequestSchema.parse(body);

    // Get the variant
    const variant = await getCvVariant(variant_id, user.id);
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const draft = variant.draft;

    // Generate content based on format
    if (format === "txt") {
      const textContent = generateTextContent(draft);
      
      return new Response(textContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="cv-${variant.label.toLowerCase()}.txt"`,
        },
      });
    }

    if (format === "docx") {
      // For now, return a structured JSON that can be used by a frontend DOCX library
      // In production, use 'docx' npm package to generate actual .docx files
      return NextResponse.json({
        format: "docx",
        message: "DOCX generation requires client-side library integration",
        content: draft,
        filename: `cv-${variant.label.toLowerCase()}.docx`,
        instructions: "Use 'docx' library on frontend to generate the file",
      });
    }

    if (format === "pdf") {
      // For now, return a structured JSON
      // In production, use puppeteer or PDFKit to generate actual PDFs
      return NextResponse.json({
        format: "pdf",
        message: "PDF generation requires server-side rendering",
        content: draft,
        filename: `cv-${variant.label.toLowerCase()}.pdf`,
        instructions: "Use Puppeteer or PDFKit to generate the PDF",
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error: any) {
    console.error("Export error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to export CV" },
      { status: 500 }
    );
  }
}

/**
 * Generate plain text version of CV
 */
function generateTextContent(draft: any): string {
  const lines: string[] = [];

  // Header
  if (draft.basics) {
    if (draft.basics.name) lines.push(draft.basics.name.toUpperCase());
    if (draft.basics.email) lines.push(draft.basics.email);
    if (draft.basics.phone) lines.push(draft.basics.phone);
    if (draft.basics.address) lines.push(draft.basics.address);
    lines.push("");
  }

  // Summary
  if (draft.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push("=".repeat(50));
    lines.push(draft.summary);
    lines.push("");
  }

  // Skills
  if (draft.skills && draft.skills.length > 0) {
    lines.push("SKILLS");
    lines.push("=".repeat(50));
    lines.push(draft.skills.join(" • "));
    lines.push("");
  }

  // Experience
  if (draft.experiences && draft.experiences.length > 0) {
    lines.push("PROFESSIONAL EXPERIENCE");
    lines.push("=".repeat(50));
    draft.experiences.forEach((exp: any) => {
      lines.push("");
      lines.push(`${exp.title} - ${exp.company}`);
      if (exp.start_date || exp.end_date) {
        lines.push(`${exp.start_date || "?"} - ${exp.end_date || "Present"}`);
      }
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach((bullet: any) => {
          lines.push(`  • ${bullet.rewritten || bullet.text || bullet}`);
        });
      }
    });
    lines.push("");
  }

  // Projects
  if (draft.projects && draft.projects.length > 0) {
    lines.push("PROJECTS");
    lines.push("=".repeat(50));
    draft.projects.forEach((proj: any) => {
      lines.push("");
      lines.push(`${proj.title}`);
      if (proj.company) lines.push(`Organization: ${proj.company}`);
      if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets.forEach((bullet: any) => {
          lines.push(`  • ${bullet.rewritten || bullet.text || bullet}`);
        });
      }
    });
    lines.push("");
  }

  // Education
  if (draft.basics?.education && draft.basics.education.length > 0) {
    lines.push("EDUCATION");
    lines.push("=".repeat(50));
    draft.basics.education.forEach((edu: string) => {
      lines.push(`  • ${edu}`);
    });
    lines.push("");
  }

  // Certifications
  if (draft.basics?.certifications && draft.basics.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    lines.push("=".repeat(50));
    draft.basics.certifications.forEach((cert: string) => {
      lines.push(`  • ${cert}`);
    });
    lines.push("");
  }

  // Footer
  lines.push("");
  lines.push("-".repeat(50));
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push(`Variant: ${draft.spelling || "US"} spelling`);
  
  return lines.join("\n");
}

/**
 * Select a variant as the user's choice
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { variant_id } = await request.json();
    if (!variant_id) {
      return NextResponse.json(
        { error: "variant_id is required" },
        { status: 400 }
      );
    }

    const { selectCvVariant } = await import("@/lib/db");
    await selectCvVariant(variant_id, user.id);

    return NextResponse.json({ success: true, selected: variant_id });
  } catch (error: any) {
    console.error("Select variant error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to select variant" },
      { status: 500 }
    );
  }
}
