import { useState } from "react";
import { Dumbbell, Clock, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn, Card, SectionLabel, Btn, StatCard, EmptyState } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { formatWorkoutDate, summarizeWorkout, weeklyVolume } from "../../features/history/metrics";

export function HistoryScreen({ data }: { data: BootstrapData | null }) {
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
