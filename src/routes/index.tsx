import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskBridge — Turn unclear requests into clear plans" },
      { name: "description", content: "TaskBridge helps freelancers turn vague work requests into organized plans with prioritized tasks and tracked progress." },
      { property: "og:title", content: "TaskBridge — Turn unclear requests into clear plans" },
      { property: "og:description", content: "Organize tasks, set priorities, and track progress on every work request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const features = [
    { icon: Target, title: "Define the outcome", text: "Capture the request, the goal, and the deadline in one place." },
    { icon: ListChecks, title: "Break it into tasks", text: "Add tasks with priorities and move them from To Do to Done." },
    { icon: TrendingUp, title: "See real progress", text: "Progress is calculated from the tasks you actually complete." },
  ];
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Wordmark />
        <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign In</Link></Button>
      </header>
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 sm:py-24">
          <p className="mb-4 text-sm font-medium text-primary">For freelancers and early-career professionals</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Turn unclear requests into clear, actionable plans.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            TaskBridge gives every work request a goal, a task list, and a progress bar — so you always know what to do next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Get Started</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Sign In</Link></Button>
          </div>
        </section>
        <section className="grid gap-4 border-t py-12 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
