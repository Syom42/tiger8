import {
  Flame, Dumbbell, Target, BarChart3, Trophy, Play, Check, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { cn, Card, SectionLabel, Btn, Badge, StatCard, Skeleton, EmptyState } from "../components/ui";
import type { BootstrapData, Plan } from "../../lib/api";
import { formatWorkoutDate, summarizeWorkout, weeklyVolume } from "../../features/history/metrics";

export function DashboardScreen({
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
