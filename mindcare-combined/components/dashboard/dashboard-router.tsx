"use client"

import { useApp } from "@/components/app-provider"
import { AppShell } from "@/components/common/app-shell"
import { PatientDashboard } from "@/components/dashboard/patient-dashboard"
import { CaregiverDashboard } from "@/components/dashboard/caregiver-dashboard"

export function DashboardRouter() {
  const { role } = useApp()
  const isCaregiver = role === "caregiver"

  return (
    <AppShell title={isCaregiver ? "Caregiver Dashboard" : "My Dashboard"}>
      {isCaregiver ? <CaregiverDashboard /> : <PatientDashboard />}
    </AppShell>
  )
}
