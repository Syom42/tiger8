import { useEffect, useState } from "react";
import {
  Plus, Search, Check, X, CalendarDays, Dumbbell, Loader2, Edit3, Trash2, AlertTriangle, Undo2, Timer, Layers,
} from "lucide-react";
import { cn, Card, SectionLabel, Btn, Badge, Dialog, EmptyState } from "../components/ui";
import { PlanEditorDialog, PLAN_TEMPLATES, formatRest } from "../components/PlanEditor";
import { type BootstrapData, type Plan } from "../../lib/api";
import { PlansApiError, deletePlan, savePlan, saveWeekPlan, type PlanExerciseInput } from "../../features/plans/api";
import { type WorkoutDraft } from "../lib/types";
import { readStoredValue, clearStoredValue, WORKOUT_DRAFT_KEY } from "../lib/storage";

export function PlansScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ plan: Plan | null; templateKey: string | null } | null>(null);
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ plan: Plan; days: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plansById = new Map(data?.plans.map(plan => [plan.id, plan]) ?? []);
  const scheduledDays = (planId: number) => Object.values(data?.weekPlan ?? {}).filter(dayPlanId => dayPlanId === planId).length;
  const planTotalSets = (plan: Plan) => plan.exercises.reduce((sum, exercise) => sum + (exercise.target_sets ?? 3), 0);
  const planDuration = (plan: Plan) => Math.round(
    plan.exercises.reduce((sum, exercise) => sum + (exercise.target_sets ?? 3) * ((exercise.rest_seconds ?? 120) + 45), 0) / 60,
  );
  const filtered = (data?.plans ?? []).filter(plan =>
    plan.name.includes(search) || (plan.description ?? "").includes(search)
  );
  const weekDays = [
    ["א", "sun"], ["ב", "mon"], ["ג", "tue"], ["ד", "wed"],
    ["ה", "thu"], ["ו", "fri"], ["ש", "sat"],
  ] as const;

  useEffect(() => {
    if (!recentlyDeleted) return;
    const timer = setTimeout(() => setRecentlyDeleted(null), 12000);
    return () => clearTimeout(timer);
  }, [recentlyDeleted]);

  const openTemplate = (key: string) => {
    setError(null);
    setEditor({ plan: null, templateKey: key });
  };

  const openCreatePlan = () => {
    setError(null);
    setEditor({ plan: null, templateKey: null });
  };

  const openEditPlan = (plan: Plan) => {
    setError(null);
    setDetailsPlan(null);
    setEditor({ plan, templateKey: null });
  };

  const savePlanFromEditor = async (input: { name: string; description: string; exercises: PlanExerciseInput[] }) => {
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    try {
      await savePlan({ id: editor.plan?.id, ...input });
      await onSaved();
      setEditor(null);
    } catch (requestError) {
      setError(requestError instanceof PlansApiError ? "לא ניתן היה לשמור את התוכנית. נסה שוב." : "אירעה שגיאה בשמירת התוכנית.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete || saving) return;
    const removed = planToDelete;
    const scheduledKeys = Object.entries(data?.weekPlan ?? {})
      .filter(([, dayPlanId]) => dayPlanId === removed.id)
      .map(([day]) => day);
    setSaving(true);
    setDeleteError(null);
    try {
      await deletePlan(removed.id);
      // An active draft for a deleted plan can never be finished — drop it.
      if (readStoredValue<WorkoutDraft>(WORKOUT_DRAFT_KEY)?.planId === removed.id) {
        clearStoredValue(WORKOUT_DRAFT_KEY);
      }
      await onSaved();
      if (active === removed.id) setActive(null);
      setPlanToDelete(null);
      setRecentlyDeleted({ plan: removed, days: scheduledKeys });
    } catch (requestError) {
      setDeleteError(requestError instanceof PlansApiError ? "לא ניתן היה למחוק את התוכנית. נסה שוב." : "אירעה שגיאה במחיקת התוכנית.");
    } finally {
      setSaving(false);
    }
  };

  const undoDeletePlan = async () => {
    if (!recentlyDeleted || saving) return;
    const { plan, days } = recentlyDeleted;
    setSaving(true);
    setError(null);
    try {
      await savePlan({
        id: plan.id,
        name: plan.name,
        description: plan.description ?? "",
        exercises: plan.exercises.map(exercise => ({
          name: exercise.exercise_name,
          supersetGroup: exercise.superset_group ?? null,
          restSeconds: exercise.rest_seconds ?? 120,
          targetSets: exercise.target_sets ?? 3,
          targetReps: exercise.target_reps ?? 10,
        })),
      });
      if (days.length) {
        await saveWeekPlan({ ...(data?.weekPlan ?? {}), ...Object.fromEntries(days.map(day => [day, plan.id])) });
      }
      await onSaved();
      setRecentlyDeleted(null);
    } catch {
      setError("לא ניתן היה לשחזר את התוכנית.");
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
        <Btn variant="primary" size="sm" onClick={openCreatePlan}>
          <Plus className="w-3.5 h-3.5" />
          תוכנית חדשה
        </Btn>
      </div>

      <Card className="p-4">
        <SectionLabel>התחל מתבנית</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" onClick={() => openTemplate("push")} className="rounded border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <p className="text-sm font-semibold">Push / Pull / Legs</p>
            <p className="text-xs text-muted-foreground mt-1">התחל עם אימון Push</p>
          </button>
          <button type="button" onClick={() => openTemplate("fullA")} className="rounded border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <p className="text-sm font-semibold">Full Body</p>
            <p className="text-xs text-muted-foreground mt-1">התחל עם Full Body A</p>
          </button>
          <button type="button" onClick={() => openTemplate("upper")} className="rounded border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <p className="text-sm font-semibold">Upper / Lower</p>
            <p className="text-xs text-muted-foreground mt-1">התחל עם אימון Upper</p>
          </button>
        </div>
      </Card>

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
                  <Layers className="w-3 h-3" />
                  {planTotalSets(plan)} סטים
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  ~{planDuration(plan)} דק׳
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

      {editor && (
        <PlanEditorDialog
          key={editor.plan?.id ?? editor.templateKey ?? "new"}
          plan={editor.plan}
          templateKey={editor.templateKey}
          library={data?.exercises ?? []}
          saving={saving}
          error={error}
          onClose={() => setEditor(null)}
          onSave={input => void savePlanFromEditor(input)}
        />
      )}
      {detailsPlan && (
        <Dialog labelId="plan-details-title" onClose={() => setDetailsPlan(null)} className="max-w-md p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-details-title" className="text-lg font-semibold">{detailsPlan.name}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => openEditPlan(detailsPlan)} className="text-primary hover:text-primary/80" aria-label="ערוך תוכנית">
                <Edit3 className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setDetailsPlan(null)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{detailsPlan.description || "ללא תיאור"}</p>
          <ul className="space-y-2 text-sm max-h-[50vh] overflow-y-auto">
            {detailsPlan.exercises.length
              ? detailsPlan.exercises.map((exercise, index) => (
                <li key={`${exercise.exercise_name}-${index}`} className="flex items-center justify-between gap-3 rounded border border-border p-2.5">
                  <span className="min-w-0 flex-1 truncate">
                    {exercise.exercise_name}
                    {exercise.superset_group && <span className="text-xs text-primary mr-2">סופרסט</span>}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0 font-mono tabular-nums">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{exercise.target_sets ?? 3}×{exercise.target_reps ?? 10}</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{formatRest(exercise.rest_seconds ?? 120)}</span>
                  </span>
                </li>
              ))
              : <li className="text-muted-foreground">אין תרגילים בתוכנית.</li>}
          </ul>
          <div className="pt-3 border-t border-border flex gap-2">
            <Btn variant="primary" size="sm" className="flex-1" onClick={() => openEditPlan(detailsPlan)}>
              <Edit3 className="w-3.5 h-3.5" />
              ערוך תוכנית
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => { setPlanToDelete(detailsPlan); setDeleteError(null); setDetailsPlan(null); }} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
              מחק
            </Btn>
          </div>
        </Dialog>
      )}
      {planToDelete && (
        <Dialog labelId="delete-plan-title" onClose={() => { if (!saving) setPlanToDelete(null); }} className="max-w-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h2 id="delete-plan-title" className="font-semibold text-lg">למחוק את התוכנית?</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            התוכנית <span className="font-semibold text-foreground">{planToDelete.name}</span> תימחק לצמיתות. לא ניתן לבטל את הפעולה.
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            {scheduledDays(planToDelete.id) > 0
              ? `התוכנית משובצת ב-${scheduledDays(planToDelete.id)} ימים בלוח השבועי, והם יתפנו.`
              : "היסטוריית האימונים שכבר הושלמו תישמר."}
          </p>
          {deleteError && <p className="text-sm text-destructive mb-3" role="alert">{deleteError}</p>}
          <div className="flex gap-2">
            <Btn variant="destructive" className="flex-1" onClick={() => void confirmDeletePlan()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              מחק תוכנית
            </Btn>
            <Btn variant="outline" className="flex-1" onClick={() => setPlanToDelete(null)} disabled={saving}>ביטול</Btn>
          </div>
        </Dialog>
      )}
      {recentlyDeleted && (
        <div role="status" className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border shadow-xl rounded-lg px-4 py-3 max-w-[calc(100vw-2rem)]">
          <span className="text-sm">התוכנית נמחקה</span>
          <Btn variant="outline" size="xs" onClick={() => void undoDeletePlan()} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
            בטל
          </Btn>
          <button type="button" onClick={() => setRecentlyDeleted(null)} className="text-muted-foreground hover:text-foreground" aria-label="סגור הודעה">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
