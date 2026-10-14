import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeProgress, errorMessage, PRIORITIES, STATUSES } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/_authenticated/plans/$planId")({
  head: () => ({ meta: [{ title: "Plan — TaskBridge" }, { name: "description", content: "Plan details and tasks." }] }),
  component: PlanPage,
});

type Plan = Tables<"plans">;
type Task = Tables<"plan_tasks">;

function PlanPage() {
  const { planId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const q = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*, plan_tasks(*)").eq("id", planId).maybeSingle();
      if (error) throw error;
      if (data) data.plan_tasks.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
      return data;
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["plan", planId] }); qc.invalidateQueries({ queryKey: ["plans"] }); };

  const delPlan = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("plans").delete().eq("id", planId); if (error) throw error; },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["plans"] }); navigate({ to: "/plans" }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40" /></div>;
  if (q.error) return <Alert variant="destructive"><AlertDescription>Couldn't load plan: {errorMessage(q.error)}</AlertDescription></Alert>;
  if (!q.data) return (
    <div className="rounded-lg border bg-card p-10 text-center">
      <h1 className="text-lg font-semibold">Plan not found</h1>
      <Button asChild variant="outline" className="mt-4"><Link to="/plans">Back to My Plans</Link></Button>
    </div>
  );

  const plan = q.data;
  const pr = computeProgress(plan.plan_tasks);
  const deliverables = Array.isArray(plan.deliverables) ? (plan.deliverables as string[]) : [];

  return (
    <div className="space-y-6">
      <Link to="/plans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> My Plans</Link>
      {editing ? (
        <EditPlan plan={plan} onDone={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} />
      ) : (
        <section className="rounded-lg border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">{plan.title}</h1>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
              <ConfirmDelete title="Delete this plan?" description="The plan and all its tasks will be permanently deleted." onConfirm={() => delPlan.mutate()} disabled={delPlan.isPending}>
                <Button size="sm" variant="ghost" disabled={delPlan.isPending}><Trash2 className="h-4 w-4" /> Delete</Button>
              </ConfirmDelete>
            </div>
          </div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <Info label="Task description" className="sm:col-span-2">{plan.description}</Info>
            <Info label="Goal">{plan.goal}</Info>
            <Info label="Deadline">{plan.deadline ?? "No deadline"}</Info>
            <Info label="Desired deliverables">
              {deliverables.length ? <ul className="list-disc pl-5">{deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul> : <span className="text-muted-foreground">None added yet</span>}
            </Info>
            <Info label="Next step">{plan.next_step || <span className="text-muted-foreground">Not set</span>}</Info>
          </dl>
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">{pr.done} of {pr.total} tasks done</span><span className="font-semibold">{pr.percent}%</span></div>
            <Progress value={pr.percent} aria-label="Overall progress" />
          </div>
        </section>
      )}
      <Tasks planId={planId} userId={plan.user_id} tasks={plan.plan_tasks} onChange={refresh} />
    </div>
  );
}

function Info({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{children}</dd></div>;
}

function EditPlan({ plan, onDone, onCancel }: { plan: Plan; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    title: plan.title, description: plan.description, goal: plan.goal, deadline: plan.deadline ?? "",
    next_step: plan.next_step ?? "", deliverables: (Array.isArray(plan.deliverables) ? (plan.deliverables as string[]) : []).join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!f.title.trim() || !f.description.trim() || !f.goal.trim()) { setError("Title, description and goal are required."); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("plans").update({
      title: f.title.trim(), description: f.description.trim(), goal: f.goal.trim(), deadline: f.deadline || null,
      next_step: f.next_step.trim() || null, deliverables: f.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
    }).eq("id", plan.id);
    setSaving(false);
    if (error) { setError(errorMessage(error)); return; }
    toast.success("Plan updated");
    onDone();
  }
  const bind = (k: keyof typeof f) => ({ id: k, value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });
  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">Edit plan</h2>
      <div className="space-y-1.5"><Label htmlFor="title">Plan Title *</Label><Input {...bind("title")} /></div>
      <div className="space-y-1.5"><Label htmlFor="description">Task Description *</Label><Textarea rows={3} {...bind("description")} /></div>
      <div className="space-y-1.5"><Label htmlFor="goal">Goal *</Label><Textarea rows={2} {...bind("goal")} /></div>
      <div className="space-y-1.5"><Label htmlFor="deliverables">Desired deliverables (one per line)</Label><Textarea rows={3} {...bind("deliverables")} /></div>
      <div className="space-y-1.5"><Label htmlFor="next_step">Next step</Label><Input {...bind("next_step")} /></div>
      <div className="space-y-1.5"><Label htmlFor="deadline">Deadline</Label><Input type="date" className="w-auto" {...bind("deadline")} /></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
      </div>
    </form>
  );
}

function Tasks({ planId, userId, tasks, onChange }: { planId: string; userId: string; tasks: Task[]; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("plan_tasks").insert({
        plan_id: planId, user_id: userId, title: title.trim(), description: desc.trim() || null, priority,
        sort_order: tasks.length ? Math.max(...tasks.map((t) => t.sort_order)) + 1 : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setDesc(""); setPriority("Medium"); toast.success("Task added"); onChange(); },
    onError: (e) => toast.error(`Couldn't add task: ${errorMessage(e)}`),
  });
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">Tasks</h2>
      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim() && !add.isPending) add.mutate(); }}
        className="mt-4 grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-[1fr_8rem_auto]"
      >
        <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="task-title">New task</Label><Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Draft homepage wireframe" /></div>
        <Input aria-label="Task description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Details (optional)" />
        <Select value={priority} onValueChange={setPriority}><SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        <Button type="submit" disabled={!title.trim() || add.isPending}>{add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</Button>
      </form>
      {tasks.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No tasks yet. Add the first one above.</p>
      ) : (
        <ul className="mt-4 divide-y">{tasks.map((t) => <TaskRow key={t.id} task={t} onChange={onChange} />)}</ul>
      )}
    </section>
  );
}

const priorityStyle: Record<string, string> = {
  High: "bg-destructive/10 text-destructive", Medium: "bg-warning/15 text-foreground", Low: "bg-muted text-muted-foreground",
};

function TaskRow({ task, onChange }: { task: Task; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");
  const update = useMutation({
    mutationFn: async (patch: Partial<Pick<Task, "title" | "description" | "status" | "priority">>) => {
      const { error } = await supabase.from("plan_tasks").update(patch).eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => { setEditing(false); onChange(); },
    onError: (e) => toast.error(`Couldn't update task: ${errorMessage(e)}`),
  });
  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("plan_tasks").delete().eq("id", task.id); if (error) throw error; },
    onSuccess: () => { toast.success("Task deleted"); onChange(); },
    onError: (e) => toast.error(`Couldn't delete task: ${errorMessage(e)}`),
  });
  const busy = update.isPending || del.isPending;

  if (editing) return (
    <li className="space-y-2 py-4">
      <Input aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea aria-label="Task description" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(task.title); setDesc(task.description ?? ""); }}>Cancel</Button>
        <Button size="sm" disabled={!title.trim() || busy} onClick={() => update.mutate({ title: title.trim(), description: desc.trim() || null })}>Save</Button>
      </div>
    </li>
  );

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className={task.status === "Done" ? "font-medium text-muted-foreground line-through" : "font-medium"}>{task.title}</p>
        {task.description && <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={task.priority} disabled={busy} onValueChange={(v) => update.mutate({ priority: v })}>
          <SelectTrigger aria-label="Priority" className={`h-8 w-28 border-0 text-xs ${priorityStyle[task.priority]}`}><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={task.status} disabled={busy} onValueChange={(v) => update.mutate({ status: v })}>
          <SelectTrigger aria-label="Status" className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit task" disabled={busy} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
        <ConfirmDelete title="Delete this task?" description="This task will be permanently deleted." onConfirm={() => del.mutate()} disabled={busy}>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Delete task" disabled={busy}><Trash2 className="h-4 w-4" /></Button>
        </ConfirmDelete>
      </div>
    </li>
  );
}
