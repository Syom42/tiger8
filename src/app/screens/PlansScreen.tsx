import { useEffect, useState } from "react";
import {
  Plus, Search, Check, X, CalendarDays, Dumbbell, Loader2, Edit3, Trash2, AlertTriangle, Undo2,
} from "lucide-react";
import { cn, Card, SectionLabel, Btn, Badge, Dialog, EmptyState } from "../components/ui";
import { type BootstrapData, type Plan } from "../../lib/api";
import { PlansApiError, deletePlan, savePlan, saveWeekPlan } from "../../features/plans/api";
import { type WorkoutDraft } from "../lib/types";
import { readStoredValue, clearStoredValue, WORKOUT_DRAFT_KEY } from "../lib/storage";

const PLAN_TEMPLATES: Record<string, { label: string; exercises: string[] }> = {
  push: { label: "Push", exercises: ["Bench Press", "Incline Bench Press", "Overhead Press", "Lateral Raise", "Tricep Pushdown", "Skull Crusher"] },
  pull: { label: "Pull", exercises: ["Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl"] },
  legs: { label: "Legs", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"] },
  fullA: { label: "Full Body A", exercises: ["Squat", "Bench Press", "Barbell Row", "Overhead Press", "Plank"] },
  fullB: { label: "Full Body B", exercises: ["Romanian Deadlift", "Incline Bench Press", "Lat Pulldown", "Dumbbell Shoulder Press", "Crunch"] },
  upper: { label: "Upper Body", exercises: ["Bench Press", "Overhead Press", "Barbell Row", "Pull-Up", "Barbell Curl", "Tricep Pushdown"] },
  lower: { label: "Lower Body", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"] },
};

export function PlansScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ plan: Plan; days: string[] } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exerciseText, setExerciseText] = useState("");
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(120);
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

  const loadTemplate = (key: string) => {
    const tpl = PLAN_TEMPLATES[key];
    if (!tpl) return;
    setName(tpl.label);
    setExerciseText(tpl.exercises.join("\n"));
  };

  useEffect(() => {
    if (!recentlyDeleted) return;
    const timer = setTimeout(() => setRecentlyDeleted(null), 12000);
    return () => clearTimeout(timer);
  }, [recentlyDeleted]);

  const openTemplate = (key: string) => {
    setEditingPlan(null);
    setDefaultRestSeconds(120);
    loadTemplate(key);
    setShowCreate(true);
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setName("");
    setDescription("");
    setExerciseText("");
    setDefaultRestSeconds(120);
    setShowCreate(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setDefaultRestSeconds(plan.exercises[0]?.rest_seconds ?? 120);
    const renderedGroups = new Set<string>();
    setExerciseText(plan.exercises.flatMap(exercise => {
      const group = exercise.superset_group;
      if (!group) return [exercise.exercise_name];
      if (renderedGroups.has(group)) return [];
      renderedGroups.add(group);
      return [plan.exercises.filter(item => item.superset_group === group).map(item => item.exercise_name).join(" + ")];
    }).join("\n"));
    setDetailsPlan(null);
    setShowCreate(true);
  };

  const saveNewPlan = async () => {
    const exercises = exerciseText.split(/\r?\n/).flatMap((line, lineIndex) => {
      const names = line.split(/\s*\+\s*/).map(item => item.trim()).filter(Boolean);
      const supersetGroup = names.length > 1 ? `pair-${lineIndex + 1}` : null;
      return names.map(name => ({ name, supersetGroup, restSeconds: defaultRestSeconds }));
    });
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await savePlan({ id: editingPlan?.id, name: name.trim(), description: description.trim(), exercises });
      await onSaved();
      setShowCreate(false);
      setEditingPlan(null);
      setName("");
      setDescription("");
      setExerciseText("");
      setDefaultRestSeconds(120);
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
              <h2 id="create-plan-title" className="text-lg font-semibold">{editingPlan ? "עריכת תוכנית" : "תוכנית חדשה"}</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">טען מתבנית</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PLAN_TEMPLATES).map(([key, tpl]) => (
                  <button key={key} type="button" onClick={() => loadTemplate(key)} className="px-2.5 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="sr-only" htmlFor="plan-name">שם התוכנית</label>
            <input id="plan-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם התוכנית" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="plan-description">תיאור התוכנית</label>
            <input id="plan-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="תיאור קצר (אופציונלי)" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="block text-sm font-medium" htmlFor="plan-rest-time">
              זמן מנוחה בין סטים (שניות)
              <input id="plan-rest-time" dir="ltr" type="number" min="15" max="900" step="15" value={defaultRestSeconds} onChange={event => setDefaultRestSeconds(Math.min(900, Math.max(15, Number(event.target.value) || 120)))} className="mt-1 w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <p className="-mt-2 text-xs text-muted-foreground">ברירת המחדל היא 120 שניות (2:00). אפשר לשנות לכל תרגיל במהלך האימון.</p>
            <label className="sr-only" htmlFor="plan-exercises">תרגילי התוכנית</label>
            <textarea id="plan-exercises" value={exerciseText} onChange={event => setExerciseText(event.target.value)} placeholder={"תרגיל אחד בכל שורה\nלדוגמה: Bench Press\nלסופרסט: Bench Press + Barbell Row"} rows={5} className="w-full bg-input-background border border-border rounded p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground">חבר שני תרגילים עם + באותה שורה כדי ליצור סופרסט.</p>
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void saveNewPlan()} disabled={!name.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingPlan ? "שמור שינויים" : "שמור תוכנית"}
              </Btn>
              <Btn variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>ביטול</Btn>
            </div>
        </Dialog>
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
          <ul className="space-y-2 text-sm">
            {detailsPlan.exercises.length
              ? detailsPlan.exercises.map(exercise => <li key={exercise.exercise_name} className="flex items-center justify-between"><span>{exercise.exercise_name}</span><span className="text-xs text-muted-foreground">{exercise.superset_group ? "סופרסט" : `${exercise.rest_seconds ?? 120} שנ׳ מנוחה`}</span></li>)
              : <li className="text-muted-foreground">אין תרגילים בתוכנית.</li>}
          </ul>
          <div className="pt-3 border-t border-border">
            <Btn variant="outline" size="sm" onClick={() => { setPlanToDelete(detailsPlan); setDeleteError(null); setDetailsPlan(null); }} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
              מחק תוכנית
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
