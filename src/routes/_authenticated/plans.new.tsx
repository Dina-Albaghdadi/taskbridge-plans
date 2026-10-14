import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/plans/new")({
  head: () => ({ meta: [{ title: "Create Plan — TaskBridge" }, { name: "description", content: "Create a new TaskBridge work plan." }] }),
  component: NewPlan,
});

function NewPlan() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", goal: "", deadline: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs.title = "Plan title is required.";
    if (!f.description.trim()) errs.description = "Task description is required.";
    if (!f.goal.trim()) errs.goal = "Desired outcome is required.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("plans").insert({
      user_id: u.user!.id, title: f.title.trim(), description: f.description.trim(), goal: f.goal.trim(), deadline: f.deadline || null,
    }).select("id").single();
    setSaving(false);
    if (error) { setError(errorMessage(error)); return; }
    qc.invalidateQueries({ queryKey: ["plans"] });
    toast.success("Plan created. Now add some tasks.");
    navigate({ to: "/plans/$planId", params: { planId: data.id } });
  }

  const field = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }), "aria-invalid": !!errors[k] });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Create Plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Describe the request. You'll add tasks on the next screen.</p>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border bg-card p-6" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="title">Plan Title *</Label>
          <Input id="title" {...field("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Task Description *</Label>
          <Textarea id="description" rows={4} placeholder="What was requested?" {...field("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal">Desired Outcome *</Label>
          <Textarea id="goal" rows={2} placeholder="What does success look like?" {...field("goal")} />
          {errors.goal && <p className="text-sm text-destructive">{errors.goal}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline">Deadline (optional)</Label>
          <Input id="deadline" type="date" className="w-auto" {...field("deadline")} />
        </div>
        {error && <Alert variant="destructive"><AlertDescription>Couldn't create plan: {error}</AlertDescription></Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/plans" })}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Plan</Button>
        </div>
      </form>
    </div>
  );
}
