<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Data access goes straight from the browser Supabase client with RLS enforcing ownership; no server functions needed since all data is per-user and RLS-protected.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate) — keep public pages top-level.
- Plan progress is always derived from tasks via `src/lib/progress.ts`; never store a progress value.
