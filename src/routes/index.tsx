import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Flame, GitBranch, LogIn, RotateCcw, Search, Sparkle, Trash2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { askJigyasa, unfoldSeed } from "@/lib/research.functions";
import {
  clearClientSessionEmail,
  clearSessionCookie,
  createSessionCookie,
  getClientSessionEmail,
  setClientSessionEmail,
} from "@/lib/local-client";
import { deleteMySeed, getMyHistory, signInWithGoogle } from "@/integrations/local-auth";
import type { QA, Research } from "@/lib/shrishti-types";
import { SeedScene } from "@/components/shrishti/SeedScene";
import { Anumana, EmptyState, Jigyasa, KaalChakra, Parva } from "@/components/shrishti/Panels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SRISHTI — Plant a seed, unfold a galaxy of knowledge" },
      {
        name: "description",
        content: "SRISHTI turns any topic into a living 3D knowledge tree you can explore, question and reason through.",
      },
      { property: "og:title", content: "SRISHTI — Plant a seed, unfold a galaxy of knowledge" },
      {
        property: "og:description",
        content: "Enter a seed. Watch it branch into worlds of knowledge. Explore, question, discover.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shrishti,
});

type PanelId = "kaal" | "parva" | "anumana" | "jigyasa";

const OPTIONS: { id: PanelId; name: string; sub: string; desc: string; Icon: typeof GitBranch }[] = [
  { id: "kaal", name: "Kaal Chakra", sub: "Timeline", desc: "Breadth of worlds, charted", Icon: CalendarRange },
  { id: "parva", name: "Parva", sub: "Events", desc: "Major problems unfolding", Icon: Flame },
  { id: "anumana", name: "Anumāna", sub: "Reasoning", desc: "How and why it came to be", Icon: GitBranch },
  { id: "jigyasa", name: "Jigyāsa", sub: "Search", desc: "Question the unfolded seed", Icon: Search },
];

interface HistoryRow {
  id: string;
  topic: string;
  research: Research;
  created_at: string;
}

function Shrishti() {
  const [session, setSession] = useState<{ user: { email: string } } | null>(null);
  const [ready, setReady] = useState(false);
  const [research, setResearch] = useState<Research | null>(null);
  const [qa, setQa] = useState<QA[]>([]);
  const [active, setActive] = useState<PanelId | null>(null);
  const [seedInput, setSeedInput] = useState("");
  const [unfolding, setUnfolding] = useState(false);
  const [asking, setAsking] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [signingIn, setSigningIn] = useState(false);

  const unfold = useServerFn(unfoldSeed);
  const ask = useServerFn(askJigyasa);
  const login = useServerFn(signInWithGoogle);
  const loadHistory = useServerFn(getMyHistory);
  const removeHistorySeed = useServerFn(deleteMySeed);

  useEffect(() => {
    const email = getClientSessionEmail();
    if (email) {
      setSession({ user: { email } });
    }
    setReady(true);
  }, []);

  const loggedIn = !!session;
  const mode = !loggedIn ? "login" : active ? "active" : "idle";
  const domeHeight = { login: "30vh", idle: "60vh", active: "26vh" }[mode];

  async function signIn() {
    setSigningIn(true);

    try {
      const response = await login({ data: { email: 'google-user@local.dev' } });
      const email = response.user.email;
      setClientSessionEmail(email);
      document.cookie = createSessionCookie(response.token);
      setSession({ user: { email } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  }

  async function backToLogin() {
    setActive(null);
    document.cookie = clearSessionCookie();
    clearClientSessionEmail();
    setSession(null);
    reset();
  }

  function reset() {
    setResearch(null);
    setQa([]);
    setActive(null);
    setSeedInput("");
  }

  async function plant(e?: React.FormEvent) {
    e?.preventDefault();
    const s = seedInput.trim();
    if (!s || unfolding) return;
    setUnfolding(true);
    setActive(null);
    try {
      const r = await unfold({ data: { seed: s } });
      setResearch(r);
      setQa([]);
      setPlayKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The seed could not unfold.");
    } finally {
      setUnfolding(false);
    }
  }

  async function onAsk(question: string) {
    if (!research) return;
    setAsking(true);
    try {
      const r = await ask({ data: { question, research } });
      setQa((q) => [...q, r]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Jigyāsa could not answer.");
    } finally {
      setAsking(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    try {
      const data = await loadHistory({ data: {} });
      setHistory((data ?? []) as HistoryRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load history.');
    }
  }

  async function deleteHistory(id: string) {
    try {
      await removeHistorySeed({ data: { id } });
      setHistory((h) => h.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete this seed.');
    }
  }

  const spring = { type: "spring" as const, stiffness: 90, damping: 22, mass: 1 };

  return (
    <main className="grain relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Om — history */}
      {loggedIn && (
        <button
          onClick={openHistory}
          aria-label="History"
          className="absolute left-5 top-4 z-30 font-display text-3xl text-primary/80 transition-colors hover:text-primary"
        >
          ॐ
        </button>
      )}

      {/* DOME */}
      <motion.section
        className="dome-surface relative mx-auto w-[min(1400px,96vw)] shrink-0 overflow-hidden"
        initial={false}
        animate={{ height: domeHeight }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0">
          <SeedScene research={research} playKey={playKey} />
        </div>
        <AnimatePresence>
          {loggedIn && research && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPlayKey((k) => k + 1)}
              aria-label="Replay unfolding"
              className="hairline absolute right-[6%] top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {loggedIn && research && mode === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-[14%] text-center"
            >
              <p className="eyebrow">Seed</p>
              <p className="font-display text-3xl capitalize text-foreground">{research.seed}</p>
            </motion.div>
          )}
          {unfolding && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="eyebrow absolute inset-x-0 bottom-[16%] text-center text-primary"
            >
              Researching · the seed is opening
            </motion.p>
          )}
        </AnimatePresence>
      </motion.section>

      <AnimatePresence mode="wait">
        {!ready ? null : !loggedIn ? (
          /* LOGIN */
          <motion.section
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40, filter: "blur(6px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col items-center justify-center px-6 text-center"
          >
            <p className="eyebrow mb-4">Seed · Unfold · Explore · Discover</p>
            <h1 className="font-display text-7xl font-light tracking-[0.18em] text-foreground md:text-8xl">SRISHTI</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Plant a single idea. Watch it branch into a galaxy of knowledge.
            </p>
            <button
              onClick={signIn}
              disabled={signingIn}
              className="hairline mt-12 flex items-center gap-3 rounded-full px-7 py-3 text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              Continue with Google
            </button>
          </motion.section>
        ) : (
          /* MAIN */
          <motion.section
            key="main"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex min-h-0 w-[min(1400px,96vw)] flex-1 flex-col gap-4 pb-5 pt-4"
          >
            <form onSubmit={plant} className="mx-auto flex w-full max-w-xl items-center gap-3 border-b border-border pb-1 focus-within:border-primary">
              <Sparkle className="h-4 w-4 text-primary" />
              <input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter a seed…"
                maxLength={120}
                className="flex-1 bg-transparent py-2 font-display text-xl text-foreground outline-none placeholder:italic placeholder:text-muted-foreground"
              />
              <button disabled={unfolding || !seedInput.trim()} className="eyebrow text-primary disabled:opacity-40">
                {unfolding ? "Unfolding…" : "Unfold"}
              </button>
            </form>

            {/* Panel */}
            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={active}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 40, filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.97, y: 20, filter: "blur(6px)" }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="hairline min-h-0 flex-1 overflow-y-auto rounded-md bg-card/60 p-6 md:p-8"
                >
                  <header className="mb-6 flex items-baseline justify-between">
                    <h2 className="font-display text-4xl text-foreground">
                      {OPTIONS.find((o) => o.id === active)?.name}
                    </h2>
                    <span className="eyebrow">{research ? research.seed : "no seed"}</span>
                  </header>
                  {!research ? (
                    <EmptyState text="Plant a seed first — enter a topic above." />
                  ) : active === "kaal" ? (
                    <KaalChakra research={research} qa={qa} />
                  ) : active === "parva" ? (
                    <Parva research={research} />
                  ) : active === "anumana" ? (
                    <Anumana research={research} />
                  ) : (
                    <div className="h-[calc(100%-4rem)] min-h-[260px]">
                      <Jigyasa qa={qa} onAsk={onAsk} busy={asking} />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {!active && <div className="flex-1" />}

            {/* SIX CONTROLS */}
            <nav className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1.7fr]">
              <motion.button
                layout
                transition={spring}
                onClick={backToLogin}
                animate={{ opacity: active ? 0.35 : 1 }}
                whileHover={{ opacity: 1 }}
                className="hairline group order-1 flex min-h-28 flex-col justify-between rounded-md p-5 text-left transition-colors hover:border-primary/60"
              >
                <LogIn className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <span>
                  <span className="block font-display text-2xl text-foreground">Login</span>
                  <span className="text-xs text-muted-foreground">Return to the threshold</span>
                </span>
              </motion.button>

              {OPTIONS.map((o, i) => {
                const isActive = active === o.id;
                return (
                  <motion.button
                    key={o.id}
                    layout
                    transition={spring}
                    onClick={() => setActive(isActive ? null : o.id)}
                    animate={{
                      opacity: active && !isActive ? 0.3 : 1,
                      scale: isActive ? 1.04 : active ? 0.95 : 1,
                      y: isActive ? -6 : 0,
                    }}
                    whileHover={{ opacity: 1 }}
                    style={{ order: i + 2 }}
                    className={cn(
                      "hairline group relative flex min-h-24 flex-col justify-between overflow-hidden rounded-md p-4 text-left transition-colors",
                      isActive ? "border-primary bg-accent" : "bg-card/40 hover:border-primary/50",
                    )}
                  >
                    {isActive && (
                      <motion.span layoutId="active-bar" className="absolute inset-x-0 top-0 h-px bg-primary" />
                    )}
                    <o.Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span>
                      <span className="block font-display text-xl leading-tight text-foreground">{o.name}</span>
                      <span className="eyebrow block">{o.sub}</span>
                      <span className="mt-1 hidden text-xs text-muted-foreground lg:block">{o.desc}</span>
                    </span>
                  </motion.button>
                );
              })}

              <motion.button
                layout
                transition={spring}
                onClick={() => setConfirmClear(true)}
                animate={{ opacity: active ? 0.35 : 1 }}
                whileHover={{ opacity: 1 }}
                style={{ order: 7 }}
                className="hairline group flex min-h-28 flex-col justify-between rounded-md p-5 text-left transition-colors hover:border-destructive/60"
              >
                <Trash2 className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
                <span>
                  <span className="block font-display text-2xl text-foreground">Nasht</span>
                  <span className="text-xs text-muted-foreground">Clear and begin anew</span>
                </span>
              </motion.button>
            </nav>
          </motion.section>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Clear this seed and begin a new exploration?</AlertDialogTitle>
            <AlertDialogDescription>Your research stays safe in history (ॐ).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Clear Seed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="bg-background">
          <SheetHeader>
            <SheetTitle className="font-display text-3xl">Recently explored</SheetTitle>
          </SheetHeader>
          <p className="eyebrow px-4">{session?.user.email}</p>
          <ul className="mt-4 space-y-1 overflow-y-auto px-2">
            {history.length === 0 && <li className="px-2 text-sm text-muted-foreground">No seeds yet.</li>}
            {history.map((h) => (
              <li key={h.id} className="group flex items-center justify-between rounded-sm px-2 py-2 hover:bg-accent">
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setResearch(h.research);
                    setQa([]);
                    setActive(null);
                    setPlayKey((k) => k + 1);
                    setHistoryOpen(false);
                  }}
                >
                  <span className="block font-display text-lg capitalize text-foreground">{h.topic}</span>
                  <span className="eyebrow">{new Date(h.created_at).toLocaleDateString()}</span>
                </button>
                <button
                  aria-label="Delete"
                  onClick={() => deleteHistory(h.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
      <path fill="currentColor" opacity=".8" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="currentColor" opacity=".6" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9L6.4 14Z" />
      <path fill="currentColor" opacity=".9" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6Z" />
    </svg>
  );
}
