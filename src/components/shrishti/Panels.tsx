import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import type { Certainty, QA, Research } from "@/lib/shrishti-types";
import { cn } from "@/lib/utils";

const ORDER: Certainty[] = ["known", "probable", "possible", "uncertain"];
const CERT_BG: Record<Certainty, string> = {
  known: "bg-known",
  probable: "bg-probable",
  possible: "bg-possible",
  uncertain: "bg-uncertain",
};

const item = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};
const list = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } };

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-display text-2xl italic text-muted-foreground">{text}</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4">
      {ORDER.map((c) => (
        <span key={c} className="eyebrow flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", CERT_BG[c])} />
          {c}
        </span>
      ))}
    </div>
  );
}

export function KaalChakra({ research, qa }: { research: Research; qa: QA[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const max = Math.max(1, ...research.branches.map((b) => b.nodes.length));
  const queryHits = (name: string) => qa.filter((q) => q.branches.includes(name)).length;
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <motion.ul variants={list} initial="hidden" animate="show" className="space-y-2">
        {research.branches.map((b, i) => {
          const hits = queryHits(b.name);
          return (
            <motion.li key={b.name + i} variants={item}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="group grid w-full grid-cols-[160px_1fr_auto] items-center gap-4 py-1.5 text-left"
              >
                <span className="flex items-center gap-1 truncate text-sm text-foreground">
                  <ChevronRight
                    className={cn("h-3 w-3 text-muted-foreground transition-transform", open === i && "rotate-90")}
                  />
                  {b.name}
                </span>
                <span className="flex h-3 overflow-hidden rounded-sm bg-muted" style={{ width: `${(b.nodes.length / max) * 100}%` }}>
                  {ORDER.map((c) => {
                    const n = b.nodes.filter((x) => x.certainty === c).length;
                    return n ? (
                      <motion.span
                        key={c}
                        className={CERT_BG[c]}
                        initial={{ width: 0 }}
                        animate={{ width: `${(n / b.nodes.length) * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : null;
                  })}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {b.nodes.length}
                  {hits > 0 && <span className="ml-2 text-primary">+{hits}q</span>}
                </span>
              </button>
              {open === i && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="ml-5 space-y-2 border-l border-border py-2 pl-4"
                >
                  {b.nodes.map((n, j) => (
                    <li key={j} className="text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <span className={cn("h-1.5 w-1.5 rounded-full", CERT_BG[n.certainty])} />
                        {n.label}
                      </span>
                      <p className="ml-3.5 text-muted-foreground">{n.detail}</p>
                    </li>
                  ))}
                </motion.ul>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
      <motion.aside variants={item} initial="hidden" animate="show" className="space-y-6">
        <div>
          <p className="eyebrow">Worlds opened</p>
          <p className="font-display text-6xl text-foreground">{research.branches.length}</p>
        </div>
        <div>
          <p className="eyebrow">Nodes · Queries</p>
          <p className="font-display text-3xl text-foreground">
            {research.branches.reduce((a, b) => a + b.nodes.length, 0)} · {qa.length}
          </p>
        </div>
        <Legend />
        {research.limitations && (
          <p className="border-l border-primary/40 pl-3 text-xs leading-relaxed text-muted-foreground">
            {research.limitations}
          </p>
        )}
      </motion.aside>
    </div>
  );
}

export function Parva({ research }: { research: Research }) {
  const sorted = [...research.problems].sort((a, b) => b.severity - a.severity);
  return (
    <motion.div variants={list} initial="hidden" animate="show" className="grid gap-px overflow-hidden rounded-md bg-border md:grid-cols-2">
      {sorted.map((p, i) => (
        <motion.article key={i} variants={item} className="space-y-3 bg-card p-5">
          <header className="flex items-start justify-between gap-4">
            <h3 className="font-display text-2xl leading-tight text-foreground">{p.title}</h3>
            <span
              className={cn(
                "eyebrow shrink-0 rounded-sm border px-2 py-1",
                p.urgency === "immediate" ? "border-destructive/50 text-destructive" : "border-border",
              )}
            >
              {p.urgency}
            </span>
          </header>
          <div className="flex gap-1" aria-label={`Severity ${p.severity} of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={cn("h-1 w-6 rounded-full", s <= p.severity ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <p className="text-sm text-foreground/90">{p.what}</p>
          <p className="text-sm text-muted-foreground">
            <span className="eyebrow mr-2">Why it matters</span>
            {p.why}
          </p>
          {p.branches.length > 0 && (
            <p className="eyebrow">Linked · {p.branches.join(" · ")}</p>
          )}
        </motion.article>
      ))}
    </motion.div>
  );
}

export function Anumana({ research }: { research: Research }) {
  const [chain, setChain] = useState(0);
  const c = research.reasoning[chain];
  if (!c) return <EmptyState text="No reasoning chains were found." />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {research.reasoning.map((r, i) => (
          <button
            key={i}
            onClick={() => setChain(i)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-sm transition-colors",
              i === chain ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {r.title}
          </button>
        ))}
      </div>
      <motion.ol key={chain} variants={list} initial="hidden" animate="show" className="relative space-y-4 pl-8">
        <span className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-primary/70 to-transparent" />
        {c.links.map((l, i) => (
          <motion.li key={i} variants={item} className="relative">
            <span className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-primary/60 bg-background font-mono text-[10px] text-primary">
              {i + 1}
            </span>
            <p className="flex flex-wrap items-center gap-2 text-foreground">
              <span className="font-display text-xl">{l.from}</span>
              <span className="eyebrow flex items-center gap-1 text-primary">
                {l.relation} <ArrowRight className="h-3 w-3" />
              </span>
              <span className="font-display text-xl">{l.to}</span>
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
              {(
                [
                  ["Why", l.why],
                  ["Evidence", l.evidence],
                  ["Assumes", l.assumptions],
                  ["Uncertain", l.uncertainty],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="eyebrow w-20 shrink-0 pt-0.5">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}

export function Jigyasa({
  qa,
  onAsk,
  busy,
}: {
  qa: QA[];
  onAsk: (q: string) => void;
  busy: boolean;
}) {
  const [q, setQ] = useState("");
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-5 overflow-y-auto pr-2">
        {qa.length === 0 && !busy && (
          <p className="font-display text-xl italic text-muted-foreground">
            Ask anything about this seed — answers come only from what has unfolded.
          </p>
        )}
        {qa.map((x, i) => (
          <motion.div key={i} variants={item} initial="hidden" animate="show" className="space-y-2">
            <p className="font-display text-xl text-foreground">{x.question}</p>
            <p className={cn("text-sm leading-relaxed", x.grounded ? "text-foreground/85" : "text-muted-foreground italic")}>
              {x.answer}
            </p>
            {x.branches.length > 0 && <p className="eyebrow">From · {x.branches.join(" · ")}</p>}
          </motion.div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching the tree…
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim() || busy) return;
          onAsk(q.trim());
          setQ("");
        }}
        className="flex items-center gap-3 border-b border-border pb-2 focus-within:border-primary"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Why… How… What if…"
          maxLength={500}
          className="flex-1 bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button disabled={busy} className="eyebrow text-primary disabled:opacity-40">
          Ask
        </button>
      </form>
    </div>
  );
}
