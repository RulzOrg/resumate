import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendNotificationEmail } from "@/lib/email"

const supportSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
})

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@airesume.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = supportSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ")
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { name, email, subject, message } = validation.data

    // Build email HTML
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">New Support Request</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>

        <h3>Message:</h3>
        <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
          <p style="white-space: pre-wrap;">${message}</p>
        </div>

        <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
          Reply directly to this email to respond to the user.
        </p>
      </div>
    `

    // Send email to support
    const result = await sendNotificationEmail(
      SUPPORT_EMAIL,
      `[ResuMate Support] ${subject}`,
      htmlContent,
      email
    )

    if (!result.success) {
      console.error("[Support] Failed to send email:", result.error)
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: "Your message has been sent. We'll get back to you within 24 hours." 
    })
  } catch (error: any) {
    console.error("[Support] Error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}

