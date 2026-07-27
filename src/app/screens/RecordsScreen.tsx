import { useState } from "react";
import { Trophy, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn, Card, Badge, EmptyState } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { formatRecordDate, recordsFromBootstrap } from "../../features/records/metrics";

export function RecordsScreen({ data }: { data: BootstrapData | null }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const records = recordsFromBootstrap(data);
  const pr = records.find(record => record.exercise === selectedExercise) ?? records[0];

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <h1 className="text-2xl font-bold">שיאים אישיים</h1>

      {/* PR grid */}
      {records.length === 0 ? (
        <EmptyState icon={Trophy} title="אין עדיין שיאים אישיים" desc="שיאים נוצרים כאשר אימון שמור כולל משקל גבוה יותר עבור תרגיל." />
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const isExpanded = expandedExercise === record.exercise;
            return (
              <Card key={record.exercise} className="overflow-hidden">
                <button
                  type="button"
                  className="w-full p-4 flex items-center gap-3 text-right"
                  onClick={() => {
                    setExpandedExercise(isExpanded ? null : record.exercise);
                    setSelectedExercise(record.exercise);
                  }}
                >
                  <Trophy className="w-4 h-4 text-[var(--gold)] flex-shrink-0" />
                  <span className="flex-1 text-sm font-semibold">{record.exercise}</span>
                  <span className="text-xl font-bold font-mono text-[var(--gold)]">{record.weight}</span>
                  <span className="text-xs text-muted-foreground">ק״ג</span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>שיא: {record.weight}kg{record.reps ? ` × ${record.reps}` : ""}</span>
                      <span>{formatRecordDate(record.date)}</span>
                    </div>
                    {record.progression.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {record.progression.slice().reverse().map((point, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-xs">
                            <span className="text-muted-foreground">{new Date(point.date).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}</span>
                            <span className="font-mono font-semibold">{point.weight} ק״ג</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">אין היסטוריה</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
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
