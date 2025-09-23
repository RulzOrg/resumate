import dynamic from "next/dynamic"

const CustomAuthPage = dynamic(() => import("@/components/auth/custom-auth-page"), { ssr: false })

export default function SignupPage() {
  return <CustomAuthPage defaultTab="signup" />
}
