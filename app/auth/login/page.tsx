import dynamic from "next/dynamic"

const CustomAuthPage = dynamic(() => import("@/components/auth/custom-auth-page"), { ssr: false })

export default function LoginPage() {
  return <CustomAuthPage defaultTab="signin" />
}
