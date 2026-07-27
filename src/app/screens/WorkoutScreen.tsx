import { useState, useEffect } from "react";
import { Check, X, Plus, Minus, Play, RotateCcw, Timer, CheckCircle, Trophy, AlertTriangle, Loader2, Flame, Link2 } from "lucide-react";
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
      restSeconds: exercise.rest_seconds ?? 90,
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
        const supersetPartners = ex.supersetGroup ? exercises.filter(item => item.supersetGroup === ex.supersetGroup).map(item => item.name) : [];
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
            <div className="flex items-center justify-between gap-2 mb-3 text-xs">
              <span className="text-primary font-medium">{ex.progressionHint}</span>
              {supersetPartners.length > 1 && <Badge variant="muted"><Link2 className="w-3 h-3" />סופרסט: {supersetPartners.join(" + ")}</Badge>}
            </div>
            <button type="button" onClick={() => addWarmupSets(ei)} className="mb-3 flex items-center gap-1 text-xs font-medium text-[var(--gold)] hover:opacity-80">
              <Flame className="w-3.5 h-3.5" />
              צור חימום אוטומטי
            </button>

            {/* Table header */}
            <div className="grid grid-cols-[1.75rem_1fr_1fr_3.5rem_2.5rem] gap-2 text-xs text-muted-foreground px-1 mb-1.5">
              <span className="text-center">סט</span>
              <span>משקל (ק״ג)</span>
              <span>חזרות</span>
              <span className="text-center">מאמץ</span>
              <span />
            </div>

            {/* Sets */}
            <div className="space-y-1.5">
              {ex.sets.map((set, si) => (
                <div key={si} className={cn("grid grid-cols-[1.75rem_1fr_1fr_3.5rem_2.5rem] gap-2 items-center rounded px-1 py-1.5 transition-colors", set.done && "bg-primary/6")}>
                  <span className="text-xs text-muted-foreground font-mono text-center">{set.isWarmup ? "ח" : si + 1}</span>
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
                  <button type="button" onClick={() => setEffortEditor({ exerciseIndex: ei, setIndex: si })} className="h-8 rounded border border-border text-[10px] text-muted-foreground hover:border-primary hover:text-primary">
                    RPE {set.rpe ?? "-"}<br />RIR {set.rir ?? "-"}
                  </button>
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
