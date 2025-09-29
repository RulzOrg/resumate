import CustomAuthPage from "@/components/auth/custom-auth-page"

export const dynamic = "force-dynamic"

export default function SignInCatchAllPage() {
  return <CustomAuthPage defaultTab="signin" />
}
