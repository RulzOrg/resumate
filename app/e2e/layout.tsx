import type React from "react"

export const metadata = {
  title: "E2E Harness",
}

export default function E2ELayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
