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

- Whole app lives on the single `/` route (ssr:false) with state-driven modes; spec forbids page navigation between features.
- AI research and Jigyāsa answers run in `src/lib/research.functions.ts` server functions with strict JSON schemas; keeps the key server-side and output parseable.
- Unfolded seeds persist in the `seeds` table per user (RLS by auth.uid()) to power the ॐ history.
