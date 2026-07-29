import { useMemo, useState } from "react";
import {
  X, Search, Plus, Minus, Trash2, ArrowUp, ArrowDown, Check, Loader2, Link2, Unlink2,
  ChevronRight, Dumbbell, Timer, Layers, Repeat, Sparkles,
} from "lucide-react";
import { cn, Btn, Badge, Dialog, EmptyState } from "./ui";
import {
  EXERCISE_CATALOG, HEBREW_ALIASES as CATALOG_ALIASES, MUSCLE_LABELS, MUSCLE_ORDER, muscleLabel,
} from "../lib/exerciseCatalog";
import type { ExerciseLibraryItem, Plan } from "../../lib/api";
import type { PlanExerciseInput } from "../../features/plans/api";

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const DEFAULT_REST = 120;

export const PLAN_TEMPLATES: Record<string, { label: string; exercises: string[] }> = {
  push: { label: "Push", exercises: ["Bench Press", "Incline Bench Press", "Overhead Press", "Lateral Raise", "Tricep Pushdown", "Skull Crusher"] },
  pull: { label: "Pull", exercises: ["Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Barbell Curl", "Hammer Curl"] },
  legs: { label: "Legs", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Lying Leg Curl", "Leg Extension", "Standing Calf Raise"] },
  fullA: { label: "Full Body A", exercises: ["Squat", "Bench Press", "Barbell Row", "Overhead Press", "Plank"] },
  fullB: { label: "Full Body B", exercises: ["Romanian Deadlift", "Incline Bench Press", "Lat Pulldown", "Dumbbell Shoulder Press", "Crunch"] },
  upper: { label: "Upper Body", exercises: ["Bench Press", "Overhead Press", "Barbell Row", "Pull-Up", "Barbell Curl", "Tricep Pushdown"] },
  lower: { label: "Lower Body", exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Lying Leg Curl", "Standing Calf Raise"] },
};

// Aliases for seeded library entries that are not part of the shared catalog.
const EXTRA_ALIASES: Record<string, string> = {
  "Bench Press": "לחיצת חזה מוט",
  "Incline Bench Press": "לחיצת חזה בשיפוע",
  "Decline Bench Press": "לחיצת חזה בשיפוע שלילי",
  "Incline Dumbbell Press": "לחיצת משקולות בשיפוע",
  "Machine Chest Press": "לחיצת חזה מכונה",
  "Dumbbell Flyes": "פרפר משקולות",
  "Cable Crossover": "פרפר פולי",
  "Pec Deck": "פרפר מכונה",
  "Chest Dip": "מקבילים חזה",
  "Push-Up": "שכיבות סמיכה",
  "Deadlift": "דדליפט",
  "Sumo Deadlift": "דדליפט סומו",
  "Trap Bar Deadlift": "דדליפט טרפ בר",
  "Romanian Deadlift": "דדליפט רומני",
  "Pull-Up": "מתח",
  "Chin-Up": "מתח אחיזה תחתונה",
  "Barbell Row": "חתירה עם מוט",
  "Dumbbell Row": "חתירה עם משקולת",
  "T-Bar Row": "חתירה טי בר",
  "Seated Cable Row": "חתירה בישיבה בפולי",
  "Chest-Supported Row": "חתירה בתמיכת חזה",
  "Lat Pulldown": "פולי עליון",
  "Straight-Arm Pulldown": "פולאובר בפולי",
  "Overhead Press": "לחיצת כתפיים מוט",
  "Dumbbell Shoulder Press": "לחיצת כתפיים משקולות",
  "Machine Shoulder Press": "לחיצת כתפיים מכונה",
  "Arnold Press": "ארנולד פרס",
  "Lateral Raise": "הרחקת כתף לצדדים",
  "Cable Lateral Raise": "הרחקה לצדדים בפולי",
  "Front Raise": "הרמה קדמית",
  "Rear Delt Fly": "פרפר הפוך",
  "Reverse Pec Deck": "פרפר הפוך מכונה",
  "Face Pull": "פייס פול",
  "Upright Row": "חתירה אנכית",
  "Shrugs": "משיכות כתפיים טרפז",
  "Barbell Curl": "כפיפת מרפקים מוט",
  "Dumbbell Curl": "כפיפת מרפקים משקולות",
  "Hammer Curl": "כפיפת פטיש",
  "Incline Dumbbell Curl": "כפיפת מרפקים בשיפוע",
  "Cable Curl": "כפיפת מרפקים בפולי",
  "Preacher Curl": "כפיפת מרפקים בסקוט",
  "Concentration Curl": "כפיפת ריכוז",
  "EZ-Bar Curl": "כפיפת מרפקים מוט EZ",
  "Reverse Curl": "כפיפה הפוכה",
  "Tricep Pushdown": "פשיטת מרפקים בפולי",
  "Overhead Tricep Extension": "פשיטת מרפקים מעל הראש",
  "Skull Crusher": "סקאל קראשר",
  "Tricep Dip": "מקבילים יד אחורית",
  "Close-Grip Bench Press": "לחיצת חזה אחיזה צרה",
  "Cable Kickback": "בעיטה אחורית בפולי",
  "Squat": "סקוואט",
  "Front Squat": "סקוואט קדמי",
  "Goblet Squat": "סקוואט גובלט",
  "Hack Squat": "האק סקוואט",
  "Bulgarian Split Squat": "סקוואט בולגרי",
  "Leg Press": "לחיצת רגליים",
  "Leg Curl": "כפיפת ברכיים",
  "Leg Extension": "פשיטת ברכיים",
  "Nordic Curl": "נורדיק קרל",
  "Hip Thrust": "היפ תראסט",
  "Glute Bridge": "גשר ישבן",
  "Calf Raise": "הרמת עקבים",
  "Seated Calf Raise": "הרמת עקבים בישיבה",
  "Lunges": "לאנג׳ים",
  "Step-Up": "עליית מדרגה",
  "Plank": "פלאנק",
  "Side Plank": "פלאנק צד",
  "Crunch": "כפיפות בטן",
  "Cable Crunch": "כפיפות בטן בפולי",
  "Sit-Up": "בטן מלאה",
  "Leg Raise": "הרמת רגליים",
  "Hanging Leg Raise": "הרמת רגליים בתלייה",
  "Russian Twist": "טוויסט רוסי",
  "Ab Rollout": "גלגלת בטן",
  "Mountain Climber": "מטפסי הרים",
  "Treadmill Run": "ריצה על הליכון",
  "Rowing Machine": "מכונת חתירה",
  "Stationary Bike": "אופני כושר",
  "Jump Rope": "קפיצה בחבל",
  "Burpee": "burpee ברפי",
  "Stair Climber": "מכונת מדרגות",
  "Box Jump": "קפיצה לקופסה",
  "Battle Ropes": "חבלי קרב",
};

const HEBREW_ALIASES: Record<string, string> = { ...EXTRA_ALIASES, ...CATALOG_ALIASES };

type PickerExercise = { id: string; name: string; muscle: string };

export type DraftExercise = {
  uid: number;
  name: string;
  muscle: string | null;
  sets: number;
  reps: number;
  rest: number;
  linkedToPrev: boolean;
};

let uidCounter = 0;
const nextUid = () => ++uidCounter;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const formatRest = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function makeDraftExercise(name: string, muscle: string | null, overrides: Partial<DraftExercise> = {}): DraftExercise {
  return {
    uid: nextUid(),
    name,
    muscle,
    sets: DEFAULT_SETS,
    reps: DEFAULT_REPS,
    rest: DEFAULT_REST,
    linkedToPrev: false,
    ...overrides,
  };
}

function draftFromPlan(plan: Plan): DraftExercise[] {
  return plan.exercises.map((exercise, index) => {
    const previous = plan.exercises[index - 1];
    const group = exercise.superset_group ?? null;
    return makeDraftExercise(exercise.exercise_name, null, {
      sets: clamp(exercise.target_sets ?? DEFAULT_SETS, 1, 20),
      reps: clamp(exercise.target_reps ?? DEFAULT_REPS, 1, 100),
      rest: clamp(exercise.rest_seconds ?? DEFAULT_REST, 0, 600),
      linkedToPrev: Boolean(group && index > 0 && previous?.superset_group === group),
    });
  });
}

// The list stores "linked to the exercise above"; the API stores shared group names.
export function toPlanExercises(items: DraftExercise[]): PlanExerciseInput[] {
  const groups: (string | null)[] = items.map(() => null);
  let groupIndex = 0;
  items.forEach((item, index) => {
    if (index === 0 || !item.linkedToPrev) return;
    if (!groups[index - 1]) {
      groupIndex += 1;
      groups[index - 1] = `pair-${groupIndex}`;
    }
    groups[index] = groups[index - 1];
  });
  return items.map((item, index) => ({
    name: item.name,
    supersetGroup: groups[index],
    restSeconds: item.rest,
    targetSets: item.sets,
    targetReps: item.reps,
  }));
}

function Stepper({
  label, icon: Icon, value, min, max, step, format, onChange,
}: {
  label: string;
  icon: typeof Timer;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 truncate">
        <Icon className="w-3 h-3 flex-shrink-0" />
        {label}
      </p>
      <div className="flex items-center gap-1 rounded border border-border bg-input-background p-0.5">
        <button
          type="button"
          aria-label={`הפחת ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step, min, max))}
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-accent active:scale-95 transition disabled:opacity-30"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="flex-1 text-center text-sm font-mono tabular-nums" aria-live="off">
          {format ? format(value) : value}
        </span>
        <button
          type="button"
          aria-label={`הגדל ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step, min, max))}
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 hover:bg-accent active:scale-95 transition disabled:opacity-30"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ExercisePicker({
  library, chosenNames, onAdd, onDone,
}: {
  library: PickerExercise[];
  chosenNames: string[];
  onAdd: (exercise: PickerExercise) => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const chosen = new Set(chosenNames.map(name => name.toLowerCase()));
  const term = query.trim().toLowerCase();

  const muscles = useMemo(() => {
    const present = new Set(library.map(item => item.muscle));
    return MUSCLE_ORDER.filter(key => present.has(key)).concat([...present].filter(key => !MUSCLE_ORDER.includes(key)));
  }, [library]);

  const results = library.filter(item => {
    if (muscle && item.muscle !== muscle) return false;
    if (!term) return true;
    const alias = HEBREW_ALIASES[item.name] ?? "";
    return item.name.toLowerCase().includes(term) || alias.includes(term) || muscleLabel(item.muscle).includes(term);
  });
  const exactMatch = library.some(item => item.name.toLowerCase() === term);

  // Results arrive pre-sorted by muscle, so a single pass builds the sections.
  const sections: Array<{ muscle: string; items: PickerExercise[] }> = [];
  for (const item of results) {
    const last = sections[sections.length - 1];
    if (last && last.muscle === item.muscle) last.items.push(item);
    else sections.push({ muscle: item.muscle, items: [item] });
  }

  return (
    <>
      <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onDone} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" aria-label="חזרה לעריכת התוכנית">
            <ChevronRight className="w-4 h-4" />
            חזרה
          </button>
          <h3 className="text-sm font-semibold">בחירת תרגילים</h3>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            aria-label="חיפוש תרגיל"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="חפש תרגיל — למשל לחיצת חזה או Squat"
            className="w-full h-10 bg-input-background border border-border rounded pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          <button
            type="button"
            onClick={() => setMuscle(null)}
            className={cn(
              "px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition-colors",
              muscle === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            הכל
          </button>
          {muscles.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setMuscle(muscle === key ? null : key)}
              className={cn(
                "px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap transition-colors",
                muscle === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {muscleLabel(key)}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{results.length} תרגילים בספרייה</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">לא נמצאו תרגילים תואמים.</p>
        )}
        {sections.map(section => (
          <div key={section.muscle} className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
              {muscleLabel(section.muscle)} · {section.items.length}
            </p>
            {section.items.map(item => {
              const added = chosen.has(item.name.toLowerCase());
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd(item)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded border p-2.5 text-right transition-colors",
                    added ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-accent/50",
                  )}
                >
                  <span className={cn("w-7 h-7 rounded flex items-center justify-center flex-shrink-0", added ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                    {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{item.name}</span>
                    {HEBREW_ALIASES[item.name] && (
                      <span className="block text-xs text-muted-foreground truncate">{HEBREW_ALIASES[item.name]}</span>
                    )}
                  </span>
                  <Badge variant="muted">{muscleLabel(item.muscle)}</Badge>
                </button>
              );
            })}
          </div>
        ))}
        {term.length > 1 && !exactMatch && (
          <button
            type="button"
            onClick={() => onAdd({ id: `custom_${term}`, name: query.trim(), muscle: "custom" })}
            className="w-full flex items-center gap-3 rounded border border-dashed border-border p-2.5 text-right hover:border-primary/50 transition-colors"
          >
            <span className="w-7 h-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <span className="flex-1 text-sm">
              הוסף תרגיל משלך: <span className="font-semibold">{query.trim()}</span>
            </span>
          </button>
        )}
      </div>

      <div className="p-4 border-t border-border flex-shrink-0">
        <Btn variant="primary" fullWidth onClick={onDone}>
          <Check className="w-4 h-4" />
          סיימתי — {chosenNames.length} תרגילים בתוכנית
        </Btn>
      </div>
    </>
  );
}

export function PlanEditorDialog({
  plan, templateKey, library, saving, error, onClose, onSave,
}: {
  plan: Plan | null;
  templateKey: string | null;
  library: ExerciseLibraryItem[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: { name: string; description: string; exercises: PlanExerciseInput[] }) => void;
}) {
  const template = templateKey ? PLAN_TEMPLATES[templateKey] : null;
  const [name, setName] = useState(plan?.name ?? template?.label ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [items, setItems] = useState<DraftExercise[]>(() => {
    if (plan) return draftFromPlan(plan);
    if (template) return template.exercises.map(exerciseName => makeDraftExercise(exerciseName, null));
    return [];
  });
  const [picking, setPicking] = useState(false);

  const pickerLibrary: PickerExercise[] = useMemo(() => {
    const catalog = EXERCISE_CATALOG.map(item => ({ id: `catalog_${item.name}`, name: item.name, muscle: item.muscle }));
    const known = new Set(catalog.map(item => item.name.toLowerCase()));
    const extra = library
      .filter(item => !known.has(item.name.toLowerCase()))
      .map(item => ({ id: item.id, name: item.name, muscle: item.muscle }));
    const rank = (muscle: string) => {
      const index = MUSCLE_ORDER.indexOf(muscle);
      return index === -1 ? MUSCLE_ORDER.length : index;
    };
    return [...catalog, ...extra].sort((a, b) => rank(a.muscle) - rank(b.muscle) || a.name.localeCompare(b.name));
  }, [library]);

  // The first exercise can never be linked to the one above it.
  const normalize = (list: DraftExercise[]) =>
    list.map((item, index) => (index === 0 && item.linkedToPrev ? { ...item, linkedToPrev: false } : item));

  const updateItem = (uid: number, patch: Partial<DraftExercise>) =>
    setItems(prev => normalize(prev.map(item => (item.uid === uid ? { ...item, ...patch } : item))));

  const removeItem = (uid: number) => setItems(prev => normalize(prev.filter(item => item.uid !== uid)));

  const moveItem = (index: number, direction: -1 | 1) => setItems(prev => {
    const target = index + direction;
    if (target < 0 || target >= prev.length) return prev;
    const next = [...prev];
    [next[index], next[target]] = [next[target], next[index]];
    return normalize(next);
  });

  const addExercise = (exercise: PickerExercise) => setItems(prev => {
    const existing = prev.find(item => item.name.toLowerCase() === exercise.name.toLowerCase());
    if (existing) return prev.filter(item => item.uid !== existing.uid);
    const last = prev[prev.length - 1];
    return [...prev, makeDraftExercise(exercise.name, exercise.muscle, last
      ? { sets: last.sets, reps: last.reps, rest: last.rest }
      : {})];
  });

  const applyToAll = (source: DraftExercise) =>
    setItems(prev => prev.map(item => ({ ...item, sets: source.sets, reps: source.reps, rest: source.rest })));

  const loadTemplate = (key: string) => {
    const selected = PLAN_TEMPLATES[key];
    if (!selected) return;
    if (!name.trim()) setName(selected.label);
    setItems(selected.exercises.map(exerciseName => {
      const known = pickerLibrary.find(item => item.name === exerciseName);
      return makeDraftExercise(exerciseName, known?.muscle ?? null);
    }));
  };

  const totalSets = items.reduce((sum, item) => sum + item.sets, 0);
  const estimatedMinutes = Math.round(items.reduce((sum, item) => sum + item.sets * (item.rest + 45), 0) / 60);
  const canSave = Boolean(name.trim()) && items.length > 0 && !saving;

  return (
    <Dialog
      labelId="plan-editor-title"
      onClose={() => { if (!saving) onClose(); }}
      className="max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden p-0"
    >
      {picking ? (
        <ExercisePicker
          library={pickerLibrary}
          chosenNames={items.map(item => item.name)}
          onAdd={addExercise}
          onDone={() => setPicking(false)}
        />
      ) : (
        <>
          <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
            <h2 id="plan-editor-title" className="text-lg font-semibold">{plan ? "עריכת תוכנית" : "בניית תוכנית"}</h2>
            <button type="button" onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="סגור">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <label className="sr-only" htmlFor="plan-name">שם התוכנית</label>
              <input
                id="plan-name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="שם התוכנית — למשל: אימון דחיפה"
                className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="sr-only" htmlFor="plan-description">תיאור התוכנית</label>
              <input
                id="plan-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="תיאור קצר (אופציונלי)"
                className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {items.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  icon={Dumbbell}
                  title="אין עדיין תרגילים"
                  desc="הוסף תרגילים מהספרייה, או התחל מתבנית מוכנה."
                  action={<Btn variant="primary" size="sm" onClick={() => setPicking(true)}><Plus className="w-3.5 h-3.5" />הוסף תרגילים</Btn>}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">התחל מתבנית</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PLAN_TEMPLATES).map(([key, tpl]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => loadTemplate(key)}
                        className="px-2.5 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">תרגילים ({items.length})</p>
                  <Btn variant="outline" size="xs" onClick={() => setPicking(true)}>
                    <Plus className="w-3 h-3" />
                    הוסף תרגיל
                  </Btn>
                </div>

                {items.map((item, index) => (
                  <div key={item.uid} className="space-y-1.5">
                    {index > 0 && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => updateItem(item.uid, { linkedToPrev: !item.linkedToPrev })}
                          aria-pressed={item.linkedToPrev}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors",
                            item.linkedToPrev
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                          )}
                        >
                          {item.linkedToPrev ? <Link2 className="w-3 h-3" /> : <Unlink2 className="w-3 h-3" />}
                          {item.linkedToPrev ? "סופרסט עם התרגיל הקודם" : "חבר לסופרסט"}
                        </button>
                      </div>
                    )}

                    <div className={cn(
                      "rounded-lg border p-3",
                      item.linkedToPrev ? "border-primary/30 bg-primary/[0.04]" : "border-border bg-card",
                    )}>
                      <div className="flex items-start gap-2 mb-3">
                        <span className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {HEBREW_ALIASES[item.name] ?? (item.muscle && MUSCLE_LABELS[item.muscle]) ?? "תרגיל מותאם"}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            aria-label={`העבר את ${item.name} למעלה`}
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`העבר את ${item.name} למטה`}
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`הסר את ${item.name}`}
                            onClick={() => removeItem(item.uid)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-end gap-2">
                        <Stepper label="סטים" icon={Layers} value={item.sets} min={1} max={12} step={1} onChange={sets => updateItem(item.uid, { sets })} />
                        <Stepper label="חזרות" icon={Repeat} value={item.reps} min={1} max={50} step={1} onChange={reps => updateItem(item.uid, { reps })} />
                        <Stepper label="מנוחה" icon={Timer} value={item.rest} min={0} max={600} step={15} format={formatRest} onChange={rest => updateItem(item.uid, { rest })} />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => applyToAll(item)}
                          className="mt-2 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          החל את ההגדרות האלה על כל התרגילים
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>

          <div className="p-4 border-t border-border flex-shrink-0 space-y-3">
            {items.length > 0 && (
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{totalSets} סטים</span>
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" />~{estimatedMinutes} דק׳</span>
                <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{items.length} תרגילים</span>
              </div>
            )}
            <div className="flex gap-2">
              <Btn
                variant="primary"
                className="flex-1"
                disabled={!canSave}
                onClick={() => onSave({ name: name.trim(), description: description.trim(), exercises: toPlanExercises(items) })}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {plan ? "שמור שינויים" : "שמור תוכנית"}
              </Btn>
              <Btn variant="outline" onClick={onClose} disabled={saving}>ביטול</Btn>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
