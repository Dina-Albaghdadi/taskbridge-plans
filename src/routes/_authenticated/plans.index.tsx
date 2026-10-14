import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeProgress, errorMessage } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export const Route = createFileRoute("/_authenticated/plans/")({
  head: () => ({ meta: [{ title: "My Plans — TaskBridge" }, { name: "description", content: "Your saved TaskBridge work plans." }] }),
  component: PlansPage,
});

function PlansPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id,title,goal,deadline,created_at,plan_tasks(status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plan deleted"); qc.invalidateQueries({ queryKey: ["plans"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">My Plans</h1>
        <Button asChild><Link to="/plans/new"><Plus className="h-4 w-4" /> Create New Plan</Link></Button>
      </div>
      {q.isLoading && <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {q.error && <Alert variant="destructive"><AlertDescription>Couldn't load plans: {errorMessage(q.error)} <button className="underline" onClick={() => q.refetch()}>Retry</button></AlertDescription></Alert>}
      {q.data && q.data.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No plans yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create your first plan to turn a request into tasks.</p>
          <Button asChild className="mt-4"><Link to="/plans/new">Create New Plan</Link></Button>
        </div>
      )}
      {q.data && q.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {q.data.map((p) => {
            const pr = computeProgress(p.plan_tasks);
            return (
              <article key={p.id} className="flex flex-col rounded-lg border bg-card p-5">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.goal}</p>
                {p.deadline && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Due {p.deadline}</p>}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{pr.done} of {pr.total} tasks done</span><span className="font-medium text-foreground">{pr.percent}%</span>
                  </div>
                  <Progress value={pr.percent} aria-label="Progress" />
                </div>
                <div className="mt-5 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1"><Link to="/plans/$planId" params={{ planId: p.id }}>Open Plan</Link></Button>
                  <ConfirmDelete title="Delete this plan?" description="The plan and all its tasks will be permanently deleted." onConfirm={() => del.mutate(p.id)} disabled={del.isPending}>
                    <Button size="sm" variant="ghost" aria-label="Delete plan" disabled={del.isPending}><Trash2 className="h-4 w-4" /></Button>
                  </ConfirmDelete>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
