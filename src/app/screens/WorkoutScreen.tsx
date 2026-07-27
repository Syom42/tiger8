import { useState, useEffect } from "react";
import { Check, X, Plus, Minus, Play, RotateCcw, Timer, CheckCircle, Trophy, AlertTriangle, Loader2 } from "lucide-react";
import { cn, Card, Btn, Badge, Dialog } from "../components/ui";
import { type BootstrapData, type Plan } from "../../lib/api";
import { saveWorkout, WorkoutApiError } from "../../features/workouts/api";
import { type WorkoutExercise, type WorkoutDraft, type WorkoutSet } from "../lib/types";
import { readStoredValue, writeStoredValue, clearStoredValue, WORKOUT_DRAFT_KEY } from "../lib/storage";

export function WorkoutScreen({
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
