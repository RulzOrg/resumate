import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { Zap } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient">ResumeAI</span>
          </Link>
        </div>

        <div className="flex justify-center">
          <SignIn routing="path" path="/auth/login" signUpUrl="/auth/signup" redirectUrl="/dashboard" />
        </div>
      </div>
    </div>
  )
}
