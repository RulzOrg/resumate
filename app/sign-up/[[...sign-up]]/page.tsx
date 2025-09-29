import CustomAuthPage from "@/components/auth/custom-auth-page"

export const dynamic = "force-dynamic"

export default function SignUpCatchAllPage() {
  return <CustomAuthPage defaultTab="signup" />
}
