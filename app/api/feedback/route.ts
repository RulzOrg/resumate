import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendNotificationEmail } from "@/lib/email"

const feedbackSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  type: z.enum(["feedback", "suggestion", "feature", "bug", "other"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
})

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || process.env.SUPPORT_EMAIL || "support@airesume.com"

const typeLabels: Record<string, string> = {
  feedback: "General Feedback",
  suggestion: "Suggestion",
  feature: "Feature Request",
  bug: "Bug Report",
  other: "Other",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = feedbackSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map((e: { message: string }) => e.message).join(", ")
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { name, email, type, message } = validation.data
    const typeLabel = typeLabels[type] || type

    // Build email HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">New ${typeLabel}</h2>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Type:</strong> <span style="display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${typeLabel}</span></p>
        </div>

        <h3>Message:</h3>
        <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
          <p style="white-space: pre-wrap; margin: 0;">${message}</p>
        </div>

        <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
          Reply directly to this email to respond to the user.
        </p>
      </div>
    `

    // Send email
    const result = await sendNotificationEmail(
      FEEDBACK_EMAIL,
      `[ResuMate ${typeLabel}] from ${name}`,
      htmlContent,
      email
    )

    if (!result.success) {
      console.error("[Feedback] Failed to send email:", result.error)
      return NextResponse.json(
        { error: "Failed to send feedback. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Your feedback has been submitted successfully. Thank you!"
    })
  } catch (error: any) {
    console.error("[Feedback] Error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
