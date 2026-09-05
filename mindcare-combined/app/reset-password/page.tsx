import { Suspense } from "react"
import { ResetPasswordView } from "@/components/auth/reset-password-view"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  )
}
