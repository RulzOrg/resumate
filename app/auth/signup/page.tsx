import CustomAuthPage from "@/components/auth/custom-auth-page"
export const dynamic = "force-dynamic"

export default function SignupPage() {
  return <CustomAuthPage defaultTab="signup" />
}
