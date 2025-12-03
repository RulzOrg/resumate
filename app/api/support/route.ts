import { type NextRequest, NextResponse } from "next/server"
import { sendSupportEmail } from "@/lib/email"
import { z } from "zod"

const supportSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(10, "Message must be at least 10 characters"),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const result = supportSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid input", details: result.error.flatten() },
                { status: 400 }
            )
        }

        const { name, email, subject, message } = result.data

        const emailResult = await sendSupportEmail({
            name,
            email,
            subject,
            message,
        })

        if (!emailResult.success) {
            return NextResponse.json(
                { error: emailResult.error || "Failed to send message" },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Support API error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
