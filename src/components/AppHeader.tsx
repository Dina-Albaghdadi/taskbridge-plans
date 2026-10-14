import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm text-primary-foreground">T</span>
      TaskBridge
    </Link>
  );
}

export function AppHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link = "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground";
  const active = { className: "bg-muted text-foreground" };
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Wordmark />
        <nav className="flex items-center gap-1">
          <Link to="/plans" className={link} activeProps={active} activeOptions={{ exact: true }}>My Plans</Link>
          <Link to="/plans/new" className={link} activeProps={active}>Create Plan</Link>
          <span className="mx-2 hidden max-w-40 truncate text-xs text-muted-foreground sm:inline">{email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Log out">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
