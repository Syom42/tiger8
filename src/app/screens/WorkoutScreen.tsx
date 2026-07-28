import { useState, useEffect } from "react";
import { Check, X, Plus, Minus, Play, RotateCcw, Timer, CheckCircle, Trophy, AlertTriangle, Loader2, Flame, Link2 } from "lucide-react";
import { cn, Card, Btn, Badge, Dialog } from "../components/ui";
import { type BootstrapData, type Plan } from "../../lib/api";
import { saveWorkout, WorkoutApiError } from "../../features/workouts/api";
import { type WorkoutExercise, type WorkoutDraft, type WorkoutSet } from "../lib/types";
import { readStoredValue, writeStoredValue, clearStoredValue, WORKOUT_DRAFT_KEY } from "../lib/storage";

// Shared column template so the header labels always line up with the cells.
const SET_GRID = "grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem_2rem] gap-1 sm:gap-2";

// Declared at module scope: a component defined inside WorkoutScreen would be a
// new type on every render, remounting the inputs and stealing focus mid-typing.
function SetStepper({ value, step, decimal, label, onChange }: {
  value: number;
  step: number;
  decimal?: boolean;
  label: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={`הפחת ${label}`}
        className="w-7 h-7 rounded border border-border flex items-center justify-center flex-shrink-0 hover:bg-accent active:scale-95 transition"
        onClick={() => onChange(value - step)}
      >
        <Minus className="w-3 h-3 text-muted-foreground" />
      </button>
      <input
        dir="ltr"
        type="number"
        inputMode={decimal ? "decimal" : "numeric"}
        aria-label={label}
        value={value}
        onChange={event => onChange((decimal ? parseFloat(event.target.value) : parseInt(event.target.value)) || 0)}
        className="min-w-0 flex-1 h-7 text-center text-sm font-mono tabular-nums rounded bg-muted/50 border border-transparent focus:outline-none focus:border-primary focus:bg-transparent text-foreground"
      />
      <button
        type="button"
        aria-label={`הגדל ${label}`}
        className="w-7 h-7 rounded border border-border flex items-center justify-center flex-shrink-0 hover:bg-accent active:scale-95 transition"
        onClick={() => onChange(value + step)}
      >
        <Plus className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}

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
    const previousSets = previousExercise?.sets.filter(set => set.done && !set.is_warmup) ?? [];
    const previousSet = previousSets[0];
    const pr = Number(data?.prs[exercise.exercise_name]?.weight) || 0;
    const previousWeight = Number(previousSet?.weight);
    const previousReps = Number(previousSet?.reps);
    const progressiveWeight = previousSet && ((previousSet.rpe !== null && previousSet.rpe !== undefined && previousSet.rpe <= 8) || (previousSet.rir ?? 0) >= 2)
      ? previousWeight + 2.5 : previousWeight;
    const suggestedWeight = Number.isFinite(progressiveWeight) && progressiveWeight > 0
      ? progressiveWeight
      : Number.isFinite(previousWeight) && previousWeight > 0
      ? previousWeight
      : pr > 0 ? Math.round((pr * 0.7) / 2.5) * 2.5 : 0;

    return {
      id: index + 1,
      name: exercise.exercise_name,
      restSeconds: exercise.rest_seconds ?? 120,
      supersetGroup: exercise.superset_group ?? null,
      pr,
      lastSession: previousWeight > 0 ? `${previousWeight} ק״ג × ${previousReps || 8}` : "אין נתון קודם",
      progressionHint: previousWeight > 0 ? `יעד מוצע: ${suggestedWeight} ק״ג × ${previousReps || 8}${suggestedWeight > previousWeight ? " (+2.5 ק״ג)" : ""}` : null,
      sets: Array.from({ length: 3 }, (_, setIndex) => {
        const previous = previousSets[setIndex] ?? previousSet;
        return { weight: Number(previous?.weight) || suggestedWeight, reps: Number(previous?.reps) || previousReps || 8, done: false, rpe: null, rir: null, isWarmup: false };
      }),
    };
  }));
  const [restTimer, setRestTimer] = useState<number | null>(draft?.restTimer ?? null);
  const [elapsed, setElapsed] = useState(draft?.elapsed ?? 0);
  const [showExit, setShowExit] = useState(false);
  const [prExercise, setPrExercise] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [effortEditor, setEffortEditor] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);

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
    const selectedExercise = exercises[ei];
    const selectedSet = selectedExercise?.sets[si];
    const supersetComplete = selectedExercise?.supersetGroup
      ? exercises.filter(exercise => exercise.supersetGroup === selectedExercise.supersetGroup)
        .every(exercise => exercise === selectedExercise || exercise.sets[si]?.done)
      : true;
    const shouldStartRest = Boolean(selectedSet && !selectedSet.done && supersetComplete);
    setExercises(prev => prev.map((ex, i) => {
      if (i !== ei) return ex;
      const sets = ex.sets.map((s, j) => {
        if (j !== si) return s;
        if (!s.done) {
          if (shouldStartRest) setRestTimer(ex.restSeconds);
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

  const updateRestSeconds = (ei: number, change: number) => {
    setExercises(prev => prev.map((exercise, exerciseIndex) => exerciseIndex !== ei ? exercise : {
      ...exercise,
      restSeconds: Math.min(900, Math.max(15, exercise.restSeconds + change)),
    }));
  };

  const updateEffort = (ei: number, si: number, field: "rpe" | "rir", value: string) => {
    const effort = value === "" ? null : Number(value);
    setExercises(prev => prev.map((exercise, exerciseIndex) => exerciseIndex !== ei ? exercise : {
      ...exercise,
      sets: exercise.sets.map((set, setIndex) => setIndex !== si ? set : { ...set, [field]: Number.isInteger(effort) ? effort : null }),
    }));
  };

  const addWarmupSets = (ei: number) => {
    setExercises(prev => prev.map((exercise, exerciseIndex) => {
      if (exerciseIndex !== ei) return exercise;
      const workingSet = exercise.sets.find(set => !set.isWarmup);
      if (!workingSet || workingSet.weight <= 0) return exercise;
      const rounded = (percentage: number) => Math.round((workingSet.weight * percentage) / 2.5) * 2.5;
      const warmups = [[0.4, 8], [0.6, 5], [0.8, 3]].map(([percentage, reps]) => ({
        weight: rounded(percentage), reps, done: false, rpe: null, rir: null, isWarmup: true,
      }));
      return { ...exercise, sets: [...warmups, ...exercise.sets.filter(set => !set.isWarmup)] };
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
          supersetGroup: exercise.supersetGroup,
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
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-w-3xl relative">
      {/* PR toast */}
      {prExercise && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[var(--gold)] text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-xl">
          <Trophy className="w-4 h-4" />
          שיא אישי חדש — {prExercise}!
        </div>
      )}

      {/* Header + progress */}
      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">{plan.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono tabular-nums">{fmt(elapsed)}</span>
              {" "}· {done}/{total} סטים
            </p>
          </div>
          <Btn variant="outline" size="sm" onClick={() => setShowExit(true)} className="flex-shrink-0">
            <X className="w-3.5 h-3.5" />
            עצור
          </Btn>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct}% הושלם</span>
            <span>{total - done} סטים נותרו</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>

      {/* Rest timer */}
      {restTimer !== null && (
        <Card className="p-3 bg-primary/8 border-primary/25 flex items-center gap-3">
          <Timer className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">זמן מנוחה</p>
            <p className="text-3xl font-mono tabular-nums font-bold text-primary leading-none">{fmt(restTimer)}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
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
        const supersetPartners = ex.supersetGroup ? exercises.filter(item => item.supersetGroup === ex.supersetGroup).map(item => item.name) : [];
        const doneCount = ex.sets.filter(s => s.done).length;
        return (
          <Card key={ex.id} className={cn("p-3 sm:p-4 transition-opacity", allDone && "opacity-70")}>
            {/* Title */}
            <div className="flex items-start gap-2.5 mb-2">
              <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5", allDone ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                {allDone ? <Check className="w-3 h-3" /> : ei + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold leading-tight truncate">{ex.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {doneCount}/{ex.sets.length} סטים · אחרון: {ex.lastSession}
                </p>
              </div>
              {ex.pr > 0 && <Badge variant="gold">שיא {ex.pr}</Badge>}
            </div>

            {/* Suggestion + superset */}
            {(ex.progressionHint || supersetPartners.length > 1) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {ex.progressionHint && (
                  <span className="text-[11px] font-medium text-primary bg-primary/8 rounded px-2 py-1 leading-tight">{ex.progressionHint}</span>
                )}
                {supersetPartners.length > 1 && (
                  <Badge variant="muted"><Link2 className="w-3 h-3" />{supersetPartners.join(" + ")}</Badge>
                )}
              </div>
            )}

            {/* Per-exercise controls */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-mono tabular-nums w-9">{fmt(ex.restSeconds)}</span>
                <button type="button" onClick={() => updateRestSeconds(ei, -30)} disabled={ex.restSeconds <= 15} aria-label={`הפחת 30 שניות מנוחה עבור ${ex.name}`} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:border-primary disabled:opacity-40">
                  <Minus className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => updateRestSeconds(ei, 30)} disabled={ex.restSeconds >= 900} aria-label={`הוסף 30 שניות מנוחה עבור ${ex.name}`} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:border-primary disabled:opacity-40">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <button type="button" onClick={() => addWarmupSets(ei)} className="flex items-center gap-1 text-xs font-medium text-[var(--gold)] hover:opacity-80">
                <Flame className="w-3.5 h-3.5" />
                חימום אוטומטי
              </button>
            </div>

            {/* Table header */}
            <div className={cn(SET_GRID, "text-[11px] text-muted-foreground mb-1.5")}>
              <span className="text-center">סט</span>
              <span className="text-center">ק״ג</span>
              <span className="text-center">חזרות</span>
              <span className="text-center">מאמץ</span>
              <span />
            </div>

            {/* Sets */}
            <div className="space-y-1">
              {ex.sets.map((set, si) => {
                const hasEffort = set.rpe !== null || set.rir !== null;
                return (
                  <div
                    key={si}
                    className={cn(
                      SET_GRID,
                      "items-center rounded-md py-1 px-0.5 transition-colors",
                      set.done && "bg-primary/8",
                      set.isWarmup && !set.done && "bg-[var(--gold)]/8",
                    )}
                  >
                    <span className="flex items-center justify-center" title={set.isWarmup ? "סט חימום" : undefined}>
                      {set.isWarmup
                        ? <Flame className="w-3.5 h-3.5 text-[var(--gold)]" aria-label="סט חימום" />
                        : <span className="text-xs text-muted-foreground font-mono">{si + 1}</span>}
                    </span>

                    <SetStepper
                      value={set.weight}
                      step={2.5}
                      decimal
                      label={`משקל בסט ${si + 1} עבור ${ex.name}`}
                      onChange={next => updateSet(ei, si, "weight", next)}
                    />

                    <SetStepper
                      value={set.reps}
                      step={1}
                      label={`חזרות בסט ${si + 1} עבור ${ex.name}`}
                      onChange={next => updateSet(ei, si, "reps", next)}
                    />

                    <button
                      type="button"
                      onClick={() => setEffortEditor({ exerciseIndex: ei, setIndex: si })}
                      aria-label={`ערוך מאמץ בסט ${si + 1} עבור ${ex.name}`}
                      className={cn(
                        "h-7 rounded border border-dashed text-[10px] font-mono leading-none flex items-center justify-center transition-colors",
                        hasEffort ? "border-solid border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                      )}
                    >
                      {set.rpe !== null ? `RPE${set.rpe}` : set.rir !== null ? `RIR${set.rir}` : "—"}
                    </button>

                    <button
                      type="button"
                      aria-label={`${set.done ? "בטל סימון" : "סמן"} סט ${si + 1} עבור ${ex.name}`}
                      className={cn(
                        "w-8 h-8 rounded flex items-center justify-center transition-all active:scale-95",
                        set.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary",
                      )}
                      onClick={() => toggleSet(ei, si)}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
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
      {effortEditor && (() => {
        const exercise = exercises[effortEditor.exerciseIndex];
        const set = exercise?.sets[effortEditor.setIndex];
        if (!exercise || !set) return null;
        return <Dialog labelId="effort-title" onClose={() => setEffortEditor(null)} className="max-w-sm p-5 space-y-4">
          <div className="flex items-center justify-between"><h3 id="effort-title" className="font-semibold">מאמץ בסט</h3><button type="button" onClick={() => setEffortEditor(null)} aria-label="סגור"><X className="w-5 h-5" /></button></div>
          <p className="text-sm text-muted-foreground">{exercise.name} · סט {effortEditor.setIndex + 1}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">RPE<select dir="ltr" value={set.rpe ?? ""} onChange={event => updateEffort(effortEditor.exerciseIndex, effortEditor.setIndex, "rpe", event.target.value)} className="mt-1 w-full h-10 bg-input-background border border-border rounded px-2"><option value="">לא נמדד</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <label className="text-sm">RIR<select dir="ltr" value={set.rir ?? ""} onChange={event => updateEffort(effortEditor.exerciseIndex, effortEditor.setIndex, "rir", event.target.value)} className="mt-1 w-full h-10 bg-input-background border border-border rounded px-2"><option value="">לא נמדד</option>{Array.from({ length: 11 }, (_, index) => <option key={index} value={index}>{index}</option>)}</select></label>
          </div>
          <Btn fullWidth onClick={() => setEffortEditor(null)}>סיום</Btn>
        </Dialog>;
      })()}
    </div>
  );
}
