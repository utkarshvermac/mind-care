import { Github, Linkedin, Mail, Sparkles } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"

// TODO(developer): replace every placeholder below with your real details —
// name, role, bio, photo, and links. Nothing here is wired to real data yet.
export default function AboutDeveloperPage() {
  return (
    <AppShell title="About the Developer">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-6 py-10 text-center sm:px-8">
            <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <span className="text-sm font-medium">Photo</span>
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Your Name Here</h2>
            <p className="mt-1 text-muted-foreground">Your role / title — e.g. Full-Stack Developer</p>
          </div>

          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div>
              <h3 className="font-display text-lg font-semibold">About me</h3>
              <p className="mt-2 text-muted-foreground text-pretty">
                Write a short bio here — who you are, what you study or do, and what motivated you to build
                MindCare. Two or three sentences is plenty.
              </p>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold">About this project</h3>
              <p className="mt-2 text-muted-foreground text-pretty">
                A line or two on why you built this, and for which hackathon or course, if relevant.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <PlaceholderLink icon={<Github className="size-4" />} label="GitHub — add your link" />
              <PlaceholderLink icon={<Linkedin className="size-4" />} label="LinkedIn — add your link" />
              <PlaceholderLink icon={<Mail className="size-4" />} label="Email — add your address" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h3 className="font-display font-semibold">Placeholder section</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This page is set up and linked in the navigation, but the content above is a placeholder. Edit{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">app/about/page.tsx</code> whenever you're
                ready to fill it in.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function PlaceholderLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground">
      {icon}
      {label}
    </span>
  )
}
