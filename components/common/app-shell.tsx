"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  Bot,
  Brain,
  ChevronLeft,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/app-provider"
import { LogoWordmark } from "@/components/common/logo"
import { caregiverProfile, patientProfile } from "@/lib/mock-data"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/games", label: "Cognitive Games", icon: Brain },
  { href: "/assistant", label: "Assistant", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About", icon: Info },
]

const mobileItems = navItems.slice(0, 4)

export function AppShell({
  children,
  title,
  back,
}: {
  children: React.ReactNode
  title?: string
  back?: { href: string; label: string }
}) {
  const { role, displayName, ready, preferences, setPreference, logout, storageOk } = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (ready && !role) router.replace("/")
  }, [ready, role, router])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const person = role === "caregiver" ? caregiverProfile : patientProfile
  const shownName = displayName || person.name
  const shownInitials = displayName
    ? displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : person.initials

  if (!ready || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-3 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading MindCare…</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.replace("/")
  }

  const sidebarNav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap-target flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const sidebarFooter = (
    <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
      <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 font-display text-sm font-semibold text-primary">
          {shownInitials}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{shownName}</span>
          <span className="text-xs capitalize text-muted-foreground">{role}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="tap-target flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Log out
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link href="/dashboard" className="rounded-xl px-2">
          <LogoWordmark />
        </Link>
        {sidebarNav}
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="animate-rise absolute inset-y-0 left-0 flex w-[290px] flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-6">
            <div className="flex items-center justify-between">
              <LogoWordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            {sidebarNav}
            {sidebarFooter}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[272px]">
        {/* Header */}
        <header className="glass sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          {back ? (
            <Link
              href={back.href}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">{back.label}</span>
            </Link>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
              {title ?? "MindCare"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setPreference("theme", preferences.theme === "dark" ? "light" : "dark")}
            aria-label={preferences.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {preferences.theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </header>

        {!storageOk ? (
          <div className="mx-4 mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning sm:mx-6">
            Your browser is blocking local storage, so progress will not be saved between visits. Everything else works
            normally.
          </div>
        ) : null}

        <main className="elder-scale mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="glass fixed inset-x-0 bottom-0 z-30 flex border-t lg:hidden"
        aria-label="Primary navigation"
      >
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-6" aria-hidden="true" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
