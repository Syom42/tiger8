import { Component, useState, useEffect, useRef, type ErrorInfo, type ReactNode, type ElementType, type MouseEventHandler } from "react";
import {
  LayoutDashboard, Dumbbell, CalendarDays, Clock, Trophy,
  Scale, Pill, User, Bot, Plus, Minus, Check, X, Play,
  RotateCcw, Search, Sun, Moon, Settings, AlertTriangle,
  Send, Edit3, Trash2, Bell, Flame, Target, BarChart3,
  Timer, CheckCircle, ArrowUp, Filter, WifiOff, Loader2,
  ChevronDown, RefreshCw, Star, Zap, Activity,
  MoreHorizontal,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ApiError, getBootstrapData, type BootstrapData, type Plan } from "../lib/api";
import { CoachApiError, sendCoachMessage, type CoachMessage } from "../features/coach/api";
import { formatWorkoutDate, summarizeWorkout, weeklyVolume } from "../features/history/metrics";
import { BodyWeightApiError, saveBodyWeight } from "../features/bodyweight/api";
import { formatRecordDate, recordsFromBootstrap } from "../features/records/metrics";
import { createSupplement, setSupplementEnabled, setSupplementTaken } from "../features/supplements/api";
import { saveWorkout, WorkoutApiError } from "../features/workouts/api";
import { createPlan, PlansApiError, saveWeekPlan } from "../features/plans/api";
import { ProfileApiError, saveProfile } from "../features/profile/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "dashboard" | "plans" | "workout" | "history"
  | "records" | "bodyweight" | "supplements" | "profile" | "ai";

type WorkoutSet = { weight: number; reps: number; done: boolean };
type WorkoutExercise = {
  id: number; name: string; sets: WorkoutSet[];
  lastSession: string; pr: number; restSeconds: number;
};

type WorkoutDraft = {
  planId: number;
  exercises: WorkoutExercise[];
  elapsed: number;
  restTimer: number | null;
};

const BOOTSTRAP_CACHE_KEY = "tiger8_bootstrap_cache";
const WORKOUT_DRAFT_KEY = "tiger8_active_workout_draft";

function readStoredValue<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function clearStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ");
}

function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("bg-card border border-border rounded-lg", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{children}</h2>
      {action && <div className="text-xs text-muted-foreground">{action}</div>}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type BtnSize = "xs" | "sm" | "md" | "lg";

function Btn({
  children, variant = "primary", size = "md", onClick, className, disabled, fullWidth,
}: {
  children: ReactNode; variant?: BtnVariant; size?: BtnSize;
  onClick?: MouseEventHandler<HTMLButtonElement>; className?: string; disabled?: boolean; fullWidth?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const vs: Record<BtnVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "text-foreground hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-border text-foreground hover:bg-accent",
  };
  const ss: Record<BtnSize, string> = {
    xs: "h-7 px-2.5 text-xs",
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-6 text-base",
  };
  return (
    <button
      className={cn(base, vs[variant], ss[size], fullWidth && "w-full", className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

type BadgeVariant = "default" | "gold" | "green" | "red" | "muted" | "blue";

function Badge({ children, variant = "default" }: { children: ReactNode; variant?: BadgeVariant }) {
  const vs: Record<BadgeVariant, string> = {
    default: "bg-secondary text-secondary-foreground",
    gold: "text-[var(--gold)] bg-[var(--gold)]/12",
    green: "text-primary bg-primary/12",
    red: "text-destructive bg-destructive/12",
    muted: "bg-muted text-muted-foreground",
    blue: "text-sky-600 bg-sky-600/10 dark:text-sky-400 dark:bg-sky-400/10",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", vs[variant])}>
      {children}
    </span>
  );
}

function StatCard({
  label, value, sub, icon: Icon, accent, mono = true,
}: {
  label: string; value: string; sub?: string;
  icon?: ElementType; accent?: "gold" | "green" | "red"; mono?: boolean;
}) {
  const color = accent === "gold" ? "text-[var(--gold)]" : accent === "green" ? "text-primary" : accent === "red" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1.5 leading-none">{label}</p>
          <p className={cn("text-2xl font-bold leading-none", mono && "font-mono tabular-nums", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1.5 leading-none">{sub}</p>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      </div>
    </Card>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn("relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", value ? "bg-primary" : "bg-muted")}
    >
      <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", value ? "right-1" : "right-5")} />
    </button>
  );
}

function Dialog({
  children,
  labelId,
  onClose,
  className,
}: {
  children: ReactNode;
  labelId: string;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
    firstFocusable?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    focusable[nextIndex].focus();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1} onKeyDown={trapFocus} className={cn("w-full bg-card border border-border rounded-lg", className)}>
        {children}
      </div>
    </div>
  );
}

class ScreenErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Tiger8 screen render failed", error, info);
  }

  render() {
    if (this.state.failed) {
      return <div className="p-6"><Card className="max-w-md p-5 space-y-3"><h1 className="text-lg font-semibold">לא ניתן להציג את המסך</h1><p className="text-sm text-muted-foreground">רענן את הדף כדי לנסות שוב.</p><Btn onClick={() => window.location.reload()}>רענן</Btn></Card></div>;
    }
    return this.props.children;
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

function EmptyState({ icon: Icon, title, desc, action }: {
  icon: ElementType; title: string; desc: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{desc}</p>
      {action}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardScreen({
  onStartWorkout,
  data,
  loading,
  canStartWorkout,
}: {
  onStartWorkout: () => void;
  data: BootstrapData | null;
  loading: boolean;
  canStartWorkout: boolean;
}) {

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-7 w-32" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = dayKeys[currentDate.getDay()];
  const plansById = new Map(data?.plans.map(plan => [plan.id, plan]) ?? []);
  const todayPlan = plansById.get(Number(data?.weekPlan[todayKey]));
  const displayName = data?.profile.name || data?.profile.email?.split("@")[0] || "ספורטאי";
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const workoutsThisWeek = (data?.workouts ?? []).filter(workout => new Date(workout.date) >= weekStart).length;
  const latestPr = Object.entries(data?.prs ?? {})
    .filter(([, pr]) => Number(pr.weight) > 0)
    .sort(([, first], [, second]) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime())[0];
  const workoutSummaries = (data?.workouts ?? []).map(summarizeWorkout);
  const volumeChart = weeklyVolume(data?.workouts ?? []);
  const weekDays = [
    { day: "א", key: "sun" }, { day: "ב", key: "mon" }, { day: "ג", key: "tue" },
    { day: "ד", key: "wed" }, { day: "ה", key: "thu" }, { day: "ו", key: "fri" }, { day: "ש", key: "sat" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{currentDate.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-bold">שלום, {displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="green">
            <Flame className="w-3 h-3" />
            {workoutsThisWeek} אימונים השבוע
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="אימונים השבוע" value={String(workoutsThisWeek)} sub={`${data?.workouts.length ?? 0} סה״כ`} icon={Dumbbell} accent="green" />
        <StatCard label="תוכניות" value={String(data?.plans.length ?? 0)} sub="בתוכנית השבועית" icon={Target} />
        <StatCard label="שיאים אישיים" value={String(Object.keys(data?.prs ?? {}).length)} sub="משקל מקסימלי" icon={BarChart3} accent="green" />
        <StatCard label="שיא אחרון" value={latestPr ? String(latestPr[1].weight) : "--"} sub={latestPr ? latestPr[0] : "אין שיאים"} icon={Trophy} accent="gold" />
      </div>

      {/* Today's workout */}
      <div>
        <SectionLabel>אימון היום</SectionLabel>
        <Card className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg leading-tight">{todayPlan?.name ?? "אין אימון מתוכנן להיום"}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{todayPlan ? `${todayPlan.exercises.length} תרגילים` : "בחר תוכנית כדי להתחיל"}</p>
            </div>
            <Btn onClick={onStartWorkout} size="lg" disabled={!canStartWorkout}>
              <Play className="w-4 h-4" />
              התחל אימון
            </Btn>
          </div>
          <div className="space-y-0 divide-y divide-border">
            {(todayPlan?.exercises ?? []).map((ex, i) => (
              <div key={`${ex.exercise_name}-${i}`} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                  <span className="text-sm font-medium">{ex.exercise_name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">מנוחה {ex.rest_seconds ?? 90} שנ׳</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly grid */}
      <div>
        <SectionLabel>שבוע נוכחי</SectionLabel>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, index) => {
            const dayPlan = plansById.get(Number(data?.weekPlan[day.key]));
            const isToday = day.key === todayKey;
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + index);
            const completed = (data?.workouts ?? []).some(workout => {
              const workoutDate = new Date(workout.date);
              return workoutDate.getFullYear() === dayDate.getFullYear() &&
                workoutDate.getMonth() === dayDate.getMonth() &&
                workoutDate.getDate() === dayDate.getDate();
            });
            return (
            <div
              key={day.key}
              className={cn(
                "rounded-lg p-2 text-center flex flex-col items-center gap-1 min-h-[60px] justify-center",
                completed && "bg-primary/10",
                isToday && !completed && "bg-primary",
                !completed && !isToday && "bg-muted",
              )}
            >
              <span className={cn("text-xs font-semibold", isToday && !completed ? "text-primary-foreground" : "text-muted-foreground")}>{day.day}</span>
              {completed ? <Check className="w-3.5 h-3.5 text-primary" /> : isToday ? <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70" /> : null}
              <span className={cn("text-[9px] leading-tight font-medium hidden md:block", isToday && !completed ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                {dayPlan?.name.split(" ").slice(0, 2).join(" ") ?? "מנוחה"}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {/* Recent + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionLabel action={<button className="text-primary hover:underline">הכל</button>}>אימונים אחרונים</SectionLabel>
          {workoutSummaries.length === 0 ? (
            <EmptyState icon={Clock} title="אין אימונים אחרונים" desc="סיים אימון כדי לראות אותו כאן." />
          ) : <div className="space-y-2">
            {workoutSummaries.slice(0, 3).map(workout => (
              <Card key={workout.id} className="flex items-center justify-between p-3 px-4 hover:border-primary/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{workout.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatWorkoutDate(workout.date)} · {workout.durationMinutes} דק׳</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-mono font-semibold">{workout.volume.toLocaleString("he-IL")} <span className="text-xs text-muted-foreground font-normal">ק״ג</span></p>
                  <p className="text-xs text-muted-foreground">{workout.setCount} סטים</p>
                </div>
              </Card>
            ))}
          </div>}
        </div>
        <div>
          <SectionLabel>נפח שבועי</SectionLabel>
          {volumeChart.length === 0 ? <EmptyState icon={BarChart3} title="אין עדיין נפח" desc="נפח שבועי יופיע אחרי סטים שהושלמו." /> : <Card className="p-4">
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={volumeChart} barSize={18} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Heebo" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, fontFamily: "Heebo", direction: "rtl" }}
                    formatter={(v: unknown) => [`${((v as number) / 1000).toFixed(1)}K ק״ג`, "נפח"]}
                    cursor={{ fill: "var(--accent)" }}
                  />
                  <Bar dataKey="volume" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>}
        </div>
      </div>
    </div>
  );
}

// ─── Plans ────────────────────────────────────────────────────────────────────

function PlansScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exerciseText, setExerciseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plansById = new Map(data?.plans.map(plan => [plan.id, plan]) ?? []);
  const scheduledDays = (planId: number) => Object.values(data?.weekPlan ?? {}).filter(dayPlanId => dayPlanId === planId).length;
  const filtered = (data?.plans ?? []).filter(plan =>
    plan.name.includes(search) || (plan.description ?? "").includes(search)
  );
  const weekDays = [
    ["א", "sun"], ["ב", "mon"], ["ג", "tue"], ["ד", "wed"],
    ["ה", "thu"], ["ו", "fri"], ["ש", "sat"],
  ] as const;

  const saveNewPlan = async () => {
    const exercises = exerciseText.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createPlan({ name: name.trim(), description: description.trim(), exercises });
      await onSaved();
      setShowCreate(false);
      setName("");
      setDescription("");
      setExerciseText("");
    } catch (requestError) {
      setError(requestError instanceof PlansApiError ? "לא ניתן היה לשמור את התוכנית. נסה שוב." : "אירעה שגיאה בשמירת התוכנית.");
    } finally {
      setSaving(false);
    }
  };

  const assignDay = async (key: string) => {
    if (!data || active === null || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveWeekPlan({
        ...data.weekPlan,
        [key]: data.weekPlan[key] === active ? null : active,
      });
      await onSaved();
    } catch {
      setError("לא ניתן היה לעדכן את הלוח השבועי. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ספריית תוכניות</h1>
        <Btn variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          תוכנית חדשה
        </Btn>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          aria-label="חיפוש תוכניות"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לפי שם, סוג, רמה..."
          className="w-full h-9 bg-input-background border border-border rounded pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="לא נמצאו תוכניות"
          desc="נסה לחפש עם מילת מפתח אחרת"
          action={<Btn variant="outline" size="sm" onClick={() => setSearch("")}>נקה חיפוש</Btn>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-live="polite" aria-label={`${filtered.length} תוכניות נמצאו`}>
          {filtered.map(plan => (
            <Card
              key={plan.id}
              className={cn("p-4 hover:border-primary/40 transition-all", active === plan.id && "ring-2 ring-primary/40 border-primary/40")}
              onClick={() => setActive(plan.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {active === plan.id && <Badge variant="green">פעיל</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description || "ללא תיאור"}</p>
                </div>
                <Badge variant="muted">{plan.exercises.length} תרגילים</Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {scheduledDays(plan.id)} ימים/שבוע
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" />
                  תוכנית אימון
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex gap-2">
                <Btn
                  variant={active === plan.id ? "secondary" : "primary"}
                  size="sm"
                  className="flex-1"
                  onClick={e => { e.stopPropagation(); setActive(plan.id); }}
                >
                  {active === plan.id ? <Check className="w-3 h-3" /> : null}
                  {active === plan.id ? "נבחר" : "בחר תוכנית"}
                </Btn>
                <Btn variant="outline" size="sm" onClick={event => { event.stopPropagation(); setDetailsPlan(plan); }}>פרטים</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Weekly scheduler */}
      <div>
        <SectionLabel>לוח שבועי — שיבוץ ידני</SectionLabel>
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(([label, key]) => {
              const scheduledPlan = plansById.get(Number(data?.weekPlan[key]));
              return <div key={key} className="flex flex-col gap-1.5">
                <span className="text-xs text-center text-muted-foreground font-semibold">{label}</span>
                <button
                  type="button"
                  disabled={active === null || saving}
                  onClick={() => void assignDay(key)}
                  title={active === null ? "בחר תוכנית לפני השיבוץ" : "שבץ או נקה את התוכנית שנבחרה"}
                  className={cn(
                  "rounded border border-dashed p-2 text-center min-h-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors text-xs",
                  scheduledPlan ? "bg-primary/8 border-primary/30" : "border-border",
                  active === null && "cursor-not-allowed opacity-70",
                )}>
                  {!scheduledPlan ? (
                    <span className="text-muted-foreground text-[10px]">מנוחה</span>
                  ) : (
                    <>
                      <Dumbbell className="w-3 h-3 text-primary" />
                      <span className="text-[9px] text-primary font-semibold leading-tight">{scheduledPlan.name}</span>
                    </>
                  )}
                </button>
              </div>;
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">בחר תוכנית, ואז לחץ על יום לשיוך או לניקוי.</p>
        </Card>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {showCreate && (
        <Dialog labelId="create-plan-title" onClose={() => { if (!saving) setShowCreate(false); }} className="max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="create-plan-title" className="text-lg font-semibold">תוכנית חדשה</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="sr-only" htmlFor="plan-name">שם התוכנית</label>
            <input id="plan-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם התוכנית" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="plan-description">תיאור התוכנית</label>
            <input id="plan-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="תיאור קצר (אופציונלי)" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="plan-exercises">תרגילי התוכנית</label>
            <textarea id="plan-exercises" value={exerciseText} onChange={event => setExerciseText(event.target.value)} placeholder={"תרגיל אחד בכל שורה\nלדוגמה: Bench Press"} rows={5} className="w-full bg-input-background border border-border rounded p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void saveNewPlan()} disabled={!name.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                שמור תוכנית
              </Btn>
              <Btn variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>ביטול</Btn>
            </div>
        </Dialog>
      )}
      {detailsPlan && (
        <Dialog labelId="plan-details-title" onClose={() => setDetailsPlan(null)} className="max-w-md p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-details-title" className="text-lg font-semibold">{detailsPlan.name}</h2>
            <button type="button" onClick={() => setDetailsPlan(null)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{detailsPlan.description || "ללא תיאור"}</p>
          <ul className="space-y-2 text-sm">
            {detailsPlan.exercises.length
              ? detailsPlan.exercises.map(exercise => <li key={exercise.exercise_name} className="flex items-center justify-between"><span>{exercise.exercise_name}</span><span className="text-xs text-muted-foreground">{exercise.rest_seconds ?? 90} שנ׳ מנוחה</span></li>)
              : <li className="text-muted-foreground">אין תרגילים בתוכנית.</li>}
          </ul>
        </Dialog>
      )}
    </div>
  );
}

// ─── Active Workout ───────────────────────────────────────────────────────────

function WorkoutScreen({
  plan,
  data,
  onComplete,
}: {
  plan: Plan;
  data: BootstrapData | null;
  onComplete: () => Promise<void>;
}) {
  const [draft] = useState<WorkoutDraft | null>(() => {
    const storedDraft = readStoredValue<WorkoutDraft>(WORKOUT_DRAFT_KEY);
    return storedDraft?.planId === plan.id ? storedDraft : null;
  });
  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => draft?.exercises ?? plan.exercises.map((exercise, index) => {
    const previousWorkout = data?.workouts.find(workout =>
      workout.exercises.some(item => item.exercise_name === exercise.exercise_name),
    );
    const previousExercise = previousWorkout?.exercises.find(item => item.exercise_name === exercise.exercise_name);
    const previousSet = previousExercise?.sets.find(set => set.done);
    const pr = Number(data?.prs[exercise.exercise_name]?.weight) || 0;
    const previousWeight = Number(previousSet?.weight);
    const previousReps = Number(previousSet?.reps);
    const suggestedWeight = Number.isFinite(previousWeight) && previousWeight > 0
      ? previousWeight
      : pr > 0 ? Math.round((pr * 0.7) / 2.5) * 2.5 : 0;

    return {
      id: index + 1,
      name: exercise.exercise_name,
      restSeconds: exercise.rest_seconds ?? 90,
      pr,
      lastSession: suggestedWeight > 0 ? `${suggestedWeight} ק״ג × ${previousReps || 8}` : "אין נתון קודם",
      sets: Array.from({ length: 3 }, () => ({ weight: suggestedWeight, reps: previousReps || 8, done: false })),
    };
  }));
  const [restTimer, setRestTimer] = useState<number | null>(draft?.restTimer ?? null);
  const [elapsed, setElapsed] = useState(draft?.elapsed ?? 0);
  const [showExit, setShowExit] = useState(false);
  const [prExercise, setPrExercise] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    writeStoredValue(WORKOUT_DRAFT_KEY, { planId: plan.id, exercises, elapsed, restTimer });
  }, [elapsed, exercises, plan.id, restTimer]);

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) { if (restTimer === 0) setRestTimer(null); return; }
    const t = setTimeout(() => setRestTimer(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [restTimer]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const toggleSet = (ei: number, si: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      const sets = ex.sets.map((s, j) => {
        if (j !== si) return s;
        if (!s.done) {
          setRestTimer(ex.restSeconds);
          if (ex.pr > 0 && s.weight > ex.pr) {
            setPrExercise(ex.name);
            setTimeout(() => setPrExercise(null), 4000);
          }
        }
        return { ...s, done: !s.done };
      });
      return { ...ex, sets };
    }));
  };

  const updateSet = (ei: number, si: number, field: "weight" | "reps", val: number) => {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== si ? s : { ...s, [field]: Math.max(0, val) }),
    }));
  };

  const done = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const total = exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const finishWorkout = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveWorkout({
        name: plan.name,
        date: new Date().toISOString(),
        duration: elapsed,
        exercises: exercises.map(exercise => ({
          name: exercise.name,
          restSeconds: exercise.restSeconds,
          sets: exercise.sets,
        })),
      });
      clearStoredValue(WORKOUT_DRAFT_KEY);
      await onComplete();
    } catch (error) {
      setSaveError(error instanceof WorkoutApiError
        ? "לא ניתן היה לשמור את האימון. נסה שוב."
        : "אירעה שגיאה בשמירת האימון.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl relative">
      {/* PR toast */}
      {prExercise && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[var(--gold)] text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-xl">
          <Trophy className="w-4 h-4" />
          שיא אישי חדש — {prExercise}!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{plan.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono">{fmt(elapsed)}</span>
            {" "}· {done}/{total} סטים
          </p>
        </div>
        <Btn variant="outline" size="sm" onClick={() => setShowExit(true)}>
          <X className="w-3.5 h-3.5" />
          עצור
        </Btn>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct}% הושלם</span>
          <span>{total - done} סטים נותרו</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Rest timer */}
      {restTimer !== null && (
        <Card className="p-3 bg-primary/8 border-primary/25 flex items-center gap-3">
          <Timer className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary mb-0.5">זמן מנוחה</p>
            <p className="text-3xl font-mono font-bold text-primary leading-none">{fmt(restTimer)}</p>
          </div>
          <div className="flex gap-1.5">
            <Btn variant="ghost" size="xs" onClick={() => setRestTimer(null)}>דלג</Btn>
            <Btn variant="outline" size="xs" onClick={() => setRestTimer(120)}>
              <RotateCcw className="w-3 h-3" />
            </Btn>
          </div>
        </Card>
      )}

      {/* Exercise cards */}
      {exercises.map((ex, ei) => {
        const allDone = ex.sets.every(s => s.done);
        return (
          <Card key={ex.id} className={cn("p-4", allDone && "opacity-60")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0", allDone ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  {allDone ? <Check className="w-3 h-3" /> : ei + 1}
                </span>
                <h3 className="font-semibold">{ex.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">אחרון: {ex.lastSession}</span>
                <Badge variant="gold">שיא {ex.pr}</Badge>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1.75rem_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground px-1 mb-1.5">
              <span className="text-center">סט</span>
              <span>משקל (ק״ג)</span>
              <span>חזרות</span>
              <span />
            </div>

            {/* Sets */}
            <div className="space-y-1.5">
              {ex.sets.map((set, si) => (
                <div key={si} className={cn("grid grid-cols-[1.75rem_1fr_1fr_2.5rem] gap-2 items-center rounded px-1 py-1.5 transition-colors", set.done && "bg-primary/6")}>
                  <span className="text-xs text-muted-foreground font-mono text-center">{si + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`הפחת משקל בסט ${si + 1}`} className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-accent transition-colors" onClick={() => updateSet(ei, si, "weight", set.weight - 2.5)}>
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <input
                      dir="ltr"
                      type="number"
                      inputMode="decimal"
                      aria-label={`משקל בסט ${si + 1} עבור ${ex.name}`}
                      value={set.weight}
                      onChange={e => updateSet(ei, si, "weight", parseFloat(e.target.value) || 0)}
                      className="w-14 h-6 text-center text-sm font-mono bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground"
                    />
                    <button type="button" aria-label={`הגדל משקל בסט ${si + 1}`} className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-accent transition-colors" onClick={() => updateSet(ei, si, "weight", set.weight + 2.5)}>
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`הפחת חזרות בסט ${si + 1}`} className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-accent transition-colors" onClick={() => updateSet(ei, si, "reps", set.reps - 1)}>
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <input
                      dir="ltr"
                      type="number"
                      inputMode="numeric"
                      aria-label={`חזרות בסט ${si + 1} עבור ${ex.name}`}
                      value={set.reps}
                      onChange={e => updateSet(ei, si, "reps", parseInt(e.target.value) || 0)}
                      className="w-10 h-6 text-center text-sm font-mono bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground"
                    />
                    <button type="button" aria-label={`הגדל חזרות בסט ${si + 1}`} className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-accent transition-colors" onClick={() => updateSet(ei, si, "reps", set.reps + 1)}>
                      <Plus className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`${set.done ? "בטל סימון" : "סמן"} סט ${si + 1} עבור ${ex.name}`}
                    className={cn("w-8 h-8 rounded flex items-center justify-center transition-all", set.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary")}
                    onClick={() => toggleSet(ei, si)}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Btn variant="primary" size="lg" fullWidth onClick={() => void finishWorkout()} disabled={saving}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        סיים אימון ({pct}% הושלם)
      </Btn>
      {saveError && <p className="text-center text-sm text-destructive">{saveError}</p>}

      {/* Exit confirm */}
      {showExit && (
        <Dialog labelId="exit-workout-title" onClose={() => { if (!saving) setShowExit(false); }} className="max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[var(--gold)]/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--gold)]" />
              </div>
              <h3 id="exit-workout-title" className="font-semibold text-lg">לצאת מהאימון?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">ההתקדמות תישמר. האימון יסומן כחלקי.</p>
            <div className="flex gap-2">
              <Btn variant="destructive" size="md" className="flex-1" onClick={() => void finishWorkout()} disabled={saving}>שמור וצא</Btn>
              <Btn variant="outline" size="md" className="flex-1" onClick={() => setShowExit(false)}>המשך אימון</Btn>
            </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

function HistoryScreen({ data }: { data: BootstrapData | null }) {
  const [view, setView] = useState<"list" | "chart">("list");
  const workouts = data?.workouts ?? [];
  const summaries = workouts.map(summarizeWorkout);
  const totalDurationMinutes = summaries.reduce((total, workout) => total + workout.durationMinutes, 0);
  const averageDuration = workouts.length ? Math.round(totalDurationMinutes / workouts.length) : 0;
  const monthlyStart = new Date();
  monthlyStart.setDate(1);
  monthlyStart.setHours(0, 0, 0, 0);
  const monthlyVolume = summaries
    .filter(workout => new Date(workout.date) >= monthlyStart)
    .reduce((total, workout) => total + workout.volume, 0);
  const volumeChart = weeklyVolume(workouts);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">היסטוריה</h1>
        <div className="flex items-center gap-1.5 bg-muted rounded p-1">
          {(["list", "chart"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={cn("px-3 py-1 rounded text-xs font-medium transition-colors", view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {v === "list" ? "רשימה" : "גרף"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="סה״כ אימונים" value={String(workouts.length)} sub={workouts.length ? "נשמרו בחשבון" : "התחל באימון הראשון"} />
        <StatCard label="שעות כולל" value={(totalDurationMinutes / 60).toFixed(1)} sub={workouts.length ? `ממוצע ${averageDuration} דק׳` : "אין זמן מצטבר"} />
        <StatCard label="נפח חודשי" value={monthlyVolume ? `${(monthlyVolume / 1000).toFixed(1)}K` : "--"} sub="ק״ג בחודש הנוכחי" accent="green" />
      </div>

      {view === "chart" ? (
        volumeChart.length === 0 ? (
          <EmptyState icon={BarChart3} title="אין עדיין נתוני נפח" desc="סיים אימון עם סטים מסומנים כדי לראות את המגמה השבועית." />
        ) : (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">נפח שבועי — 6 שבועות אחרונים</h3>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Heebo" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, direction: "rtl" }}
                    formatter={(v: unknown) => [`${((v as number) / 1000).toFixed(1)}K ק״ג`, "נפח"]}
                    cursor={{ fill: "var(--accent)" }}
                  />
                  <Bar dataKey="volume" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )
      ) : (
        summaries.length === 0 ? (
          <EmptyState icon={Clock} title="ההיסטוריה עדיין ריקה" desc="האימונים שתסיים יופיעו כאן עם משך, סטים ונפח." />
        ) : (
          <div className="space-y-2">
            {summaries.map(workout => (
              <Card key={workout.id} className="p-4 hover:border-primary/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{workout.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatWorkoutDate(workout.date)} · {workout.durationMinutes} דק׳ · {workout.setCount} סטים</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-mono font-semibold text-sm">{workout.volume.toLocaleString("he-IL")} <span className="text-xs font-normal text-muted-foreground">ק״ג</span></p>
                    <p className="text-xs text-muted-foreground">נפח</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── Personal Records ─────────────────────────────────────────────────────────

function RecordsScreen({ data }: { data: BootstrapData | null }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const records = recordsFromBootstrap(data);
  const pr = records.find(record => record.exercise === selectedExercise) ?? records[0];

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <h1 className="text-2xl font-bold">שיאים אישיים</h1>

      {/* PR grid */}
      {records.length === 0 ? (
        <EmptyState icon={Trophy} title="אין עדיין שיאים אישיים" desc="שיאים נוצרים כאשר אימון שמור כולל משקל גבוה יותר עבור תרגיל." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {records.map(record => (
            <Card
              key={record.exercise}
              className={cn("p-4 cursor-pointer transition-all hover:border-[var(--gold)]/40", pr?.exercise === record.exercise && "ring-2 ring-[var(--gold)]/50 border-[var(--gold)]/40")}
              onClick={() => setSelectedExercise(record.exercise)}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{record.exercise}</p>
                <Trophy className="w-4 h-4 text-[var(--gold)]" />
              </div>
              <p className="text-3xl font-bold font-mono text-[var(--gold)] leading-none mb-1">{record.weight}</p>
              <p className="text-xs text-muted-foreground mb-2">ק״ג{record.reps ? ` × ${record.reps}` : ""}</p>
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary font-medium">{formatRecordDate(record.date)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Progression chart */}
      {pr && pr.progression.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">התקדמות — {pr.exercise}</h3>
            <Badge variant="gold">{pr.weight} ק״ג שיא נוכחי</Badge>
          </div>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={pr.progression} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Heebo" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={["dataMin - 10", "dataMax + 5"]} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, direction: "rtl" }}
                  formatter={(v: unknown) => [`${v} ק״ג`, pr.exercise]}
                />
                <Line type="monotone" dataKey="weight" stroke="var(--gold)" strokeWidth={2.5} dot={{ fill: "var(--gold)", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Body Weight ──────────────────────────────────────────────────────────────

function BodyWeightScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const entries = (data?.weight ?? []).map(entry => ({
    date: entry.date,
    w: Number(entry.weight),
  })).filter(entry => Number.isFinite(entry.w));
  const latest = entries.at(-1)?.w;
  const first = entries[0]?.w;
  const change = latest !== undefined && first !== undefined ? latest - first : 0;

  const handleSave = async () => {
    const value = Number(newWeight);
    if (!Number.isFinite(value) || value <= 0 || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      await saveBodyWeight(value);
      await onSaved();
      setNewWeight("");
      setMessage("המדידה נשמרה בהצלחה");
    } catch (error) {
      setMessage(error instanceof BodyWeightApiError
        ? "לא ניתן היה לשמור את המדידה. נסה שוב."
        : "אירעה שגיאה בשמירת המדידה.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold">משקל גוף</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="משקל נוכחי" value={latest?.toFixed(1) ?? "--"} sub="ק״ג" icon={Scale} accent="green" />
        <StatCard label="מדידה ראשונה" value={first?.toFixed(1) ?? "--"} sub="ק״ג" />
        <StatCard label="שינוי מצטבר" value={entries.length > 1 ? `${change > 0 ? "+" : ""}${change.toFixed(1)}` : "--"} sub="ק״ג" accent={change > 0 ? "green" : undefined} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium">מגמת משקל</p>
          <span className="text-sm font-mono font-bold text-primary">{entries.length} מדידות</span>
        </div>
        <p className="text-xs text-muted-foreground">מוצגים רק נתונים שנשמרו בחשבון שלך.</p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState icon={Scale} title="אין עדיין מדידות" desc="הוסף מדידת משקל ראשונה כדי לעקוב אחרי המגמה שלך." />
      ) : (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">כל המדידות</h3>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={entries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "Heebo" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, direction: "rtl" }}
                  formatter={(v: unknown) => [`${v} ק״ג`, "משקל"]}
                />
                <Area type="monotone" dataKey="w" stroke="var(--primary)" strokeWidth={2} fill="url(#wGrad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">הוסף מדידה</h3>
        <div className="flex gap-2">
          <input
            dir="ltr"
            type="number"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="83.2"
            className="flex-1 h-9 bg-input-background border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Btn variant="primary" size="md" onClick={() => void handleSave()} disabled={!newWeight || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
          </Btn>
        </div>
        {message && <p className={cn("text-xs mt-2", message === "המדידה נשמרה בהצלחה" ? "text-primary" : "text-destructive")}>{message}</p>}
      </Card>
    </div>
  );
}

// ─── Supplements ──────────────────────────────────────────────────────────────

function SupplementsScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("");
  const items = data?.supplements ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const activeItems = items.filter(item => item.enabled);
  const takenToday = activeItems.filter(item => item.taken_dates.includes(today)).length;

  const update = async (id: string, operation: () => Promise<void>) => {
    if (savingId) return;
    setSavingId(id);
    setError(null);
    try {
      await operation();
      await onSaved();
    } catch {
      setError("לא ניתן היה לעדכן את התוסף. נסה שוב.");
    } finally {
      setSavingId(null);
    }
  };

  const addSupplement = async () => {
    if (!name.trim() || savingId) return;
    setSavingId("new");
    setError(null);
    try {
      await createSupplement({ name: name.trim(), dose: dose.trim(), time });
      await onSaved();
      setShowCreate(false);
      setName("");
      setDose("");
      setTime("");
    } catch {
      setError("לא ניתן היה להוסיף את התוסף. נסה שוב.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תוספי תזונה</h1>
        <Btn variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          הוסף תוסף
        </Btn>
      </div>

      {/* Today's log */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">יומן היום</h3>
          <span className="text-xs text-muted-foreground">{takenToday}/{activeItems.length} נלקחו</span>
        </div>
        {activeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תוספים פעילים ליומן היום.</p>
        ) : (
          <div className="space-y-2.5">
            {activeItems.map(item => {
              const taken = item.taken_dates.includes(today);
              return <button
                key={item.id}
                type="button"
                disabled={savingId === item.id}
                onClick={() => void update(item.id, () => setSupplementTaken(item.id, !taken))}
                className="w-full flex items-center gap-3 text-right disabled:opacity-50"
              >
                <span className="text-xs text-muted-foreground font-mono w-11 flex-shrink-0">{item.time ?? "--:--"}</span>
                <span className={cn("flex-1 text-sm", !taken && "text-muted-foreground")}>{item.name}</span>
                {taken
                  ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                }
              </button>;
            })}
          </div>
        )}
      </Card>

      {/* Supplement list */}
      <div>
        <SectionLabel>רשימת תוספים</SectionLabel>
        {items.length === 0 ? (
          <EmptyState icon={Pill} title="אין עדיין תוספים" desc="הוסף תוסף כדי לעקוב אחר הנטילה היומית שלו." />
        ) : (
          <div className="space-y-2">
          {items.map(s => (
            <Card key={s.id} className={cn("p-3.5 flex items-center gap-3 transition-opacity", !s.enabled && "opacity-50")}>
              <div className="w-1.5 h-10 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.dose ?? "ללא מינון"} · {s.time ?? "ללא שעה"}</p>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Badge variant={s.enabled ? "green" : "muted"}>{s.enabled ? "פעיל" : "כבוי"}</Badge>
                <Toggle value={s.enabled} label={`הפעלת ${s.name}`} onChange={enabled => void update(s.id, () => setSupplementEnabled(s, enabled))} />
              </div>
            </Card>
          ))}
          </div>
        )}
        </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {showCreate && (
        <Dialog labelId="create-supplement-title" onClose={() => { if (savingId !== "new") setShowCreate(false); }} className="max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="create-supplement-title" className="text-lg font-semibold">תוסף חדש</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="sr-only" htmlFor="supplement-name">שם התוסף</label>
            <input id="supplement-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם התוסף" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="supplement-dose">מינון</label>
            <input id="supplement-dose" value={dose} onChange={event => setDose(event.target.value)} placeholder="מינון, לדוגמה 5 גרם" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="supplement-time">שעת נטילה</label>
            <input id="supplement-time" dir="ltr" type="time" value={time} onChange={event => setTime(event.target.value)} className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void addSupplement()} disabled={!name.trim() || savingId === "new"}>
                {savingId === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                הוסף תוסף
              </Btn>
              <Btn variant="outline" onClick={() => setShowCreate(false)} disabled={savingId === "new"}>ביטול</Btn>
            </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileScreen({
  isDark,
  setIsDark,
  offlineMode,
  data,
  onSaved,
}: {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  offlineMode: boolean;
  data: BootstrapData | null;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data?.profile.name ?? "");
  const [age, setAge] = useState(data?.profile.age?.toString() ?? "");
  const [height, setHeight] = useState(data?.profile.height?.toString() ?? "");
  const [goal, setGoal] = useState(data?.profile.goal ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestWeight = data?.weight.at(-1)?.weight;
  const displayName = data?.profile.name || data?.profile.email?.split("@")[0] || "ספורטאי";

  const openEditor = () => {
    setName(data?.profile.name ?? "");
    setAge(data?.profile.age?.toString() ?? "");
    setHeight(data?.profile.height?.toString() ?? "");
    setGoal(data?.profile.goal ?? "");
    setError(null);
    setEditing(true);
  };

  const persistProfile = async () => {
    if (saving) return;
    const parsedAge = age.trim() ? Number(age) : null;
    const parsedHeight = height.trim() ? Number(height) : null;
    if ((parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge <= 0)) ||
      (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0))) {
      setError("יש להזין גיל וגובה תקינים.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        name: name.trim() || null,
        age: parsedAge,
        height: parsedHeight,
        goal: goal.trim() || null,
      });
      await onSaved();
      setEditing(false);
    } catch (requestError) {
      setError(requestError instanceof ProfileApiError ? "לא ניתן היה לשמור את הפרופיל. נסה שוב." : "אירעה שגיאה בשמירת הפרופיל.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">פרופיל והגדרות</h1>

      {/* User card */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg leading-tight">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{data?.workouts.length ?? 0} אימונים נשמרו בחשבון</p>
          </div>
          <Btn variant="outline" size="sm" onClick={openEditor}>
            <Edit3 className="w-3.5 h-3.5" />
            ערוך
          </Btn>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center">
          <div>
            <p className="text-2xl font-bold font-mono text-primary">{data?.profile.height ?? "--"}</p>
            <p className="text-xs text-muted-foreground">גובה (ס״מ)</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{latestWeight ?? "--"}</p>
            <p className="text-xs text-muted-foreground">משקל (ק״ג)</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{data?.profile.age ?? "--"}</p>
            <p className="text-xs text-muted-foreground">גיל</p>
          </div>
        </div>
      </Card>

      {/* Settings list */}
      <Card className="divide-y divide-border overflow-hidden">
        {[
          {
            label: "מצב לילה",
            desc: isDark ? "ממשק כהה — פעיל" : "ממשק בהיר — פעיל",
            icon: isDark ? Moon : Sun,
            action: <Toggle value={isDark} label="מצב לילה" onChange={setIsDark} />,
          },
          {
            label: "שפה",
            desc: "עברית (Hebrew)",
            icon: Settings,
            action: <Badge variant="muted">עברית</Badge>,
          },
          {
            label: "התראות",
            desc: "תזכורות אימון ותוספים",
            icon: Bell,
            action: <Badge variant="green">פעיל</Badge>,
          },
          {
            label: "יחידות משקל",
            desc: "קילוגרם",
            icon: Scale,
            action: <Badge variant="muted">ק״ג</Badge>,
          },
          {
            label: "מצב חיבור",
            desc: offlineMode ? "מוצגים נתונים שמורים לקריאה בלבד" : "מחובר ומסונכרן",
            icon: WifiOff,
            action: <Badge variant={offlineMode ? "muted" : "green"}>{offlineMode ? "לא מקוון" : "מחובר"}</Badge>,
          },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            {item.action}
          </div>
        ))}
      </Card>

      {editing && (
        <Dialog labelId="edit-profile-title" onClose={() => { if (!saving) setEditing(false); }} className="max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="edit-profile-title" className="text-lg font-semibold">עריכת פרופיל</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="sr-only" htmlFor="profile-name">שם</label>
            <input id="profile-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="profile-age">גיל</label>
              <input id="profile-age" dir="ltr" type="number" inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} placeholder="גיל" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <label className="sr-only" htmlFor="profile-height">גובה בסנטימטרים</label>
              <input id="profile-height" dir="ltr" type="number" inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)} placeholder="גובה בס״מ" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <label className="sr-only" htmlFor="profile-goal">מטרת אימון</label>
            <input id="profile-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="מטרה, לדוגמה כוח או מסה" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void persistProfile()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                שמור
              </Btn>
              <Btn variant="outline" onClick={() => setEditing(false)} disabled={saving}>ביטול</Btn>
            </div>
        </Dialog>
      )}
    </div>
  );
}

// ─── AI Coach ─────────────────────────────────────────────────────────────────

function AIScreen() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "שלום. אני כאן כדי לעזור לך לתכנן אימונים, התאוששות והתקדמות. על מה תרצה לעבוד?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const question = input.trim();
    if (!question || typing) return;

    const userMsg = { role: "user" as const, text: question };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setTyping(true);

    try {
      const coachMessages: CoachMessage[] = [
        ...nextMessages.map(message => ({
          role: message.role === "ai" ? "assistant" as const : "user" as const,
          content: message.text,
        })),
      ];
      const response = await sendCoachMessage(coachMessages);
      setMessages(previous => [...previous, { role: "ai", text: response }]);
    } catch (requestError) {
      const message = requestError instanceof CoachApiError && requestError.status === 503
        ? "מאמן ה-AI עדיין לא הוגדר בסביבת הפיתוח. הוסף GROQ_API_KEY ב-Vercel Development ונסה שוב."
        : "לא ניתן היה לקבל תשובה ממאמן ה-AI. נסה שוב בעוד רגע.";
      setError(message);
    } finally {
      setTyping(false);
    }
  };

  const suggestions = ["הצע תרגיל חלופי", "ניתח את השיאים שלי", "כמה מנוחה אני צריך?", "בנה לי מיקרו-מחזור"];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-2xl">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold">מאמן AI</h1>
            <p className="text-xs text-muted-foreground">עצות אימון והתאוששות מותאמות לשאלה שלך</p>
          </div>
          <div className="mr-auto flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", error ? "bg-destructive" : "bg-primary")} />
            <span className="text-xs text-muted-foreground">{error ? "נדרשת הגדרה" : "מחובר"}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-start" : "justify-end")}>
            <div className={cn(
              "max-w-[82%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-end">
            <div className="bg-primary/15 text-primary rounded-lg px-4 py-2.5 text-sm flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              מעבד...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/25 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-5 pb-2 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-5 pt-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="שאל על אימון, תזונה, התאוששות..."
            className="flex-1 h-10 bg-input-background border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Btn variant="primary" size="md" onClick={() => void send()} disabled={!input.trim() || typing}>
            {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "plans", label: "תוכניות", icon: CalendarDays },
  { id: "history", label: "היסטוריה", icon: Clock },
  { id: "records", label: "שיאים", icon: Trophy },
  { id: "bodyweight", label: "משקל גוף", icon: Scale },
  { id: "supplements", label: "תוספים", icon: Pill },
  { id: "ai", label: "מאמן AI", icon: Bot },
  { id: "profile", label: "פרופיל", icon: User },
];

const MOBILE_NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "בקרה", icon: LayoutDashboard },
  { id: "history", label: "היסטוריה", icon: Clock },
  { id: "records", label: "שיאים", icon: Trophy },
];

const MOBILE_MORE_NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "plans", label: "תוכניות", icon: CalendarDays },
  { id: "bodyweight", label: "משקל גוף", icon: Scale },
  { id: "supplements", label: "תוספים", icon: Pill },
  { id: "ai", label: "מאמן AI", icon: Bot },
  { id: "profile", label: "פרופיל", icon: User },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<Plan | null>(null);
  const [offlineMode, setOfflineMode] = useState(() => !navigator.onLine);
  const [bootstrapData, setBootstrapData] = useState<BootstrapData | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [showMobileMore, setShowMobileMore] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const setOnline = () => setOfflineMode(false);
    const setOffline = () => setOfflineMode(true);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  useEffect(() => {
    getBootstrapData()
      .then(data => {
        writeStoredValue(BOOTSTRAP_CACHE_KEY, data);
        setBootstrapData(data);
        setOfflineMode(false);
      })
      .catch(error => {
        if (error instanceof ApiError && error.status === 401) {
          window.location.assign("/login.html");
          return;
        }
        console.error("Failed to load Tiger8 data", error);
        const cachedData = readStoredValue<BootstrapData>(BOOTSTRAP_CACHE_KEY);
        if (cachedData) {
          setBootstrapData(cachedData);
          setOfflineMode(true);
          setBootstrapError("מוצגים נתונים שמורים. חיבור לרשת נדרש כדי לסנכרן שינויים.");
        } else {
          setBootstrapError("לא ניתן היה לטעון את הנתונים. בדוק את החיבור ונסה לרענן.");
        }
      })
      .finally(() => setBootstrapLoading(false));
  }, []);

  const refreshBootstrapData = async () => {
    try {
      const data = await getBootstrapData();
      writeStoredValue(BOOTSTRAP_CACHE_KEY, data);
      setBootstrapData(data);
      setBootstrapError(null);
      setOfflineMode(false);
    } catch (error) {
      console.error("Failed to refresh Tiger8 data", error);
      setOfflineMode(true);
      setBootstrapError("לא ניתן היה לסנכרן את השינויים. נסה שוב כאשר החיבור יחזור.");
    }
  };

  useEffect(() => {
    if (!bootstrapData || activeWorkoutPlan) return;
    const draft = readStoredValue<WorkoutDraft>(WORKOUT_DRAFT_KEY);
    const plan = draft && bootstrapData.plans.find(item => item.id === draft.planId);
    if (plan) {
      setActiveWorkoutPlan(plan);
      setScreen("workout");
    } else if (draft) {
      clearStoredValue(WORKOUT_DRAFT_KEY);
    }
  }, [activeWorkoutPlan, bootstrapData]);

  const workoutActive = activeWorkoutPlan !== null;
  const scheduledPlan = () => {
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const planId = bootstrapData?.weekPlan[dayKeys[new Date().getDay()]];
    return bootstrapData?.plans.find(plan => plan.id === Number(planId)) ?? null;
  };
  const startWorkout = () => {
    const plan = scheduledPlan();
    if (!plan || plan.exercises.length === 0) return;
    setActiveWorkoutPlan(plan);
    setScreen("workout");
  };

  const navigate = (s: Screen) => {
    if (activeWorkoutPlan) return;
    setScreen(s);
    setShowMobileMore(false);
  };

  const renderScreen = () => {
    if (activeWorkoutPlan) return <WorkoutScreen plan={activeWorkoutPlan} data={bootstrapData} onComplete={async () => {
      await refreshBootstrapData();
      setActiveWorkoutPlan(null);
      setScreen("history");
    }} />;
    switch (screen) {
      case "dashboard": return <DashboardScreen onStartWorkout={startWorkout} data={bootstrapData} loading={bootstrapLoading} canStartWorkout={Boolean(scheduledPlan()?.exercises.length)} />;
      case "plans": return <PlansScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "history": return <HistoryScreen data={bootstrapData} />;
      case "records": return <RecordsScreen data={bootstrapData} />;
      case "bodyweight": return <BodyWeightScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "supplements": return <SupplementsScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "profile": return <ProfileScreen isDark={isDark} setIsDark={setIsDark} offlineMode={offlineMode} data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "ai": return <AIScreen />;
      default: return <DashboardScreen onStartWorkout={startWorkout} data={bootstrapData} loading={bootstrapLoading} canStartWorkout={Boolean(scheduledPlan()?.exercises.length)} />;
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-background text-foreground overflow-hidden" style={{ fontFamily: "'Heebo', sans-serif" }}>
      {/* Desktop sidebar — right side in RTL */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-l border-border flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-base tracking-tight">Tiger8</span>
          </div>
        </div>

        {/* Workout CTA */}
        <div className="px-3 py-3 border-b border-border">
          <Btn
            variant="primary"
            size="sm"
            fullWidth
            onClick={startWorkout}
            disabled={workoutActive || !scheduledPlan()?.exercises.length}
          >
            <Play className="w-3.5 h-3.5" />
            {workoutActive ? "אימון פעיל" : "התחל אימון"}
          </Btn>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = !workoutActive && screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-right",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-0.5">
          {offlineMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-destructive/10 text-destructive text-xs mb-1">
              <WifiOff className="w-3.5 h-3.5" />
              מצב לא מקוון
            </div>
          )}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? "מצב יום" : "מצב לילה"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-sm">Tiger8</span>
          </div>
          <div className="flex items-center gap-2">
            {workoutActive && (
              <Badge variant="green">
                <Activity className="w-3 h-3" />
                אימון פעיל
              </Badge>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? "החלף למצב יום" : "החלף למצב לילה"}
              title={isDark ? "החלף למצב יום" : "החלף למצב לילה"}
              className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <ScreenErrorBoundary>{renderScreen()}</ScreenErrorBoundary>
        {bootstrapError && (
          <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm bg-destructive/10 border border-destructive/25 text-destructive rounded px-4 py-3 text-sm shadow-lg">
            {bootstrapError}
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {MOBILE_NAV.map(item => {
          const active = !workoutActive && screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              disabled={workoutActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowMobileMore(true)}
          disabled={workoutActive}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors text-muted-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] leading-none">עוד</span>
        </button>
        <button
          onClick={startWorkout}
          disabled={workoutActive || !scheduledPlan()?.exercises.length}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors",
            workoutActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center -mt-4 border-2 border-border", workoutActive ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>
            <Play className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-none mt-1">{workoutActive ? "ממשיך" : "אימון"}</span>
        </button>
      </nav>
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setShowMobileMore(false)}>
          <div className="w-full bg-card border-t border-border p-5 space-y-2" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">ניווט נוסף</h2>
              <button type="button" onClick={() => setShowMobileMore(false)} aria-label="סגור" className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {MOBILE_MORE_NAV.map(item => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} className="w-full flex items-center gap-3 px-3 py-3 rounded text-right hover:bg-accent">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
