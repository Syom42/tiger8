import { useState } from "react";
import { Trophy, ChevronDown, Edit3, Check, X, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn, Card, Badge, Btn, Dialog, EmptyState } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { correctPersonalRecord } from "../../features/records/api";
import { formatRecordDate, recordsFromBootstrap } from "../../features/records/metrics";

export function RecordsScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const records = recordsFromBootstrap(data);
  const pr = records.find(record => record.exercise === selectedExercise) ?? records[0];

  const openEditor = (record: typeof records[number]) => {
    setEditingExercise(record.exercise);
    setWeight(String(record.weight));
    setReps(String(record.reps ?? 1));
    setError(null);
  };

  const saveRecord = async () => {
    const parsedWeight = Number(weight);
    const parsedReps = Number(reps);
    if (!editingExercise || !Number.isFinite(parsedWeight) || parsedWeight <= 0 || !Number.isInteger(parsedReps) || parsedReps < 1) {
      setError("יש להזין משקל וחזרות תקינים.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await correctPersonalRecord({ exercise: editingExercise, weight: parsedWeight, reps: parsedReps, date: new Date().toISOString() });
      await onSaved();
      setEditingExercise(null);
    } catch {
      setError("לא ניתן היה לעדכן את השיא. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

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
                      <div className="flex items-center gap-2">
                        <span>{formatRecordDate(record.date)}</span>
                        <button type="button" onClick={() => openEditor(record)} aria-label={`ערוך שיא ${record.exercise}`} className="text-primary hover:text-primary/80">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
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
      {editingExercise && (
        <Dialog labelId="edit-record-title" onClose={() => { if (!saving) setEditingExercise(null); }} className="max-w-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="edit-record-title" className="text-lg font-semibold">תיקון שיא אישי</h2>
            <button type="button" onClick={() => setEditingExercise(null)} className="text-muted-foreground hover:text-foreground" aria-label="סגור"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-muted-foreground">{editingExercise}</p>
          <div className="grid grid-cols-2 gap-2">
            <input dir="ltr" type="number" inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} placeholder="משקל" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input dir="ltr" type="number" inputMode="numeric" value={reps} onChange={event => setReps(event.target.value)} placeholder="חזרות" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Btn className="flex-1" onClick={() => void saveRecord()} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}שמור</Btn>
            <Btn variant="outline" onClick={() => setEditingExercise(null)} disabled={saving}>ביטול</Btn>
          </div>
        </Dialog>
      )}
    </div>
  );
}
