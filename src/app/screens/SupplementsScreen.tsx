import { useState } from "react";
import { Plus, Check, X, Pill, Loader2, CheckCircle } from "lucide-react";
import { cn, Card, SectionLabel, Btn, Badge, Toggle, Dialog, EmptyState } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { createSupplement, setSupplementEnabled, setSupplementTaken } from "../../features/supplements/api";

export function SupplementsScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timeHour, setTimeHour] = useState("08");
  const [timeMin, setTimeMin] = useState("00");
  const items = data?.supplements ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const activeItems = items.filter(item => item.enabled);
  const takenToday = activeItems.filter(item => item.taken_dates.includes(today)).length;

  const clampHour = (v: string) => { const n = parseInt(v.replace(/\D/g, "").slice(0, 2)); return isNaN(n) ? "" : String(Math.min(n, 23)).padStart(v.length > 1 ? 2 : 1, "0"); };
  const clampMin = (v: string) => { const n = parseInt(v.replace(/\D/g, "").slice(0, 2)); return isNaN(n) ? "" : String(Math.min(n, 59)).padStart(v.length > 1 ? 2 : 1, "0"); };

  const update = async (id: string, operation: () => Promise<void>) => {
    if (savingId) return;
    setSavingId(id);
    setError(null);
    try {
      await operation();
      await onSaved();
    } catch {
      setError("לא ניתן היה לעדכן את התוסף. נסה שוב.");
    } finally {
      setSavingId(null);
    }
  };

  const addSupplement = async () => {
    if (!name.trim() || savingId) return;
    setSavingId("new");
    setError(null);
    try {
      const time = `${(timeHour || "08").padStart(2, "0")}:${(timeMin || "00").padStart(2, "0")}`;
      await createSupplement({ name: name.trim(), dose: dose.trim(), time });
      await onSaved();
      setShowCreate(false);
      setName("");
      setDose("");
      setTimeHour("08");
      setTimeMin("00");
    } catch {
      setError("לא ניתן היה להוסיף את התוסף. נסה שוב.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">תוספי תזונה</h1>
        <Btn variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          הוסף תוסף
        </Btn>
      </div>

      {/* Today's log */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">יומן היום</h3>
          <span className="text-xs text-muted-foreground">{takenToday}/{activeItems.length} נלקחו</span>
        </div>
        {activeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תוספים פעילים ליומן היום.</p>
        ) : (
          <div className="space-y-2.5">
            {activeItems.map(item => {
              const taken = item.taken_dates.includes(today);
              return <button
                key={item.id}
                type="button"
                disabled={savingId === item.id}
                onClick={() => void update(item.id, () => setSupplementTaken(item.id, !taken))}
                className="w-full flex items-center gap-3 text-right disabled:opacity-50"
              >
                <span className="text-xs text-muted-foreground font-mono w-11 flex-shrink-0">{item.time ?? "--:--"}</span>
                <span className={cn("flex-1 text-sm", !taken && "text-muted-foreground")}>{item.name}</span>
                {taken
                  ? <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                }
              </button>;
            })}
          </div>
        )}
      </Card>

      {/* Supplement list */}
      <div>
        <SectionLabel>רשימת תוספים</SectionLabel>
        {items.length === 0 ? (
          <EmptyState icon={Pill} title="אין עדיין תוספים" desc="הוסף תוסף כדי לעקוב אחר הנטילה היומית שלו." />
        ) : (
          <div className="space-y-2">
          {items.map(s => (
            <Card key={s.id} className={cn("p-3.5 flex items-center gap-3 transition-opacity", !s.enabled && "opacity-50")}>
              <div className="w-1.5 h-10 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.dose ?? "ללא מינון"} · {s.time ?? "ללא שעה"}</p>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Badge variant={s.enabled ? "green" : "muted"}>{s.enabled ? "פעיל" : "כבוי"}</Badge>
                <Toggle value={s.enabled} label={`הפעלת ${s.name}`} onChange={enabled => void update(s.id, () => setSupplementEnabled(s, enabled))} />
              </div>
            </Card>
          ))}
          </div>
        )}
        </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {showCreate && (
        <Dialog labelId="create-supplement-title" onClose={() => { if (savingId !== "new") setShowCreate(false); }} className="max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="create-supplement-title" className="text-lg font-semibold">תוסף חדש</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="sr-only" htmlFor="supplement-name">שם התוסף</label>
            <input id="supplement-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם התוסף" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <label className="sr-only" htmlFor="supplement-dose">מינון</label>
            <input id="supplement-dose" value={dose} onChange={event => setDose(event.target.value)} placeholder="מינון, לדוגמה 5 גרם" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">שעת תזכורת</p>
              <div className="flex items-center gap-2">
                <input
                  dir="ltr"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={timeHour}
                  onChange={e => setTimeHour(clampHour(e.target.value))}
                  placeholder="08"
                  aria-label="שעה"
                  className="w-14 h-11 text-center text-lg font-bold font-mono bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xl font-bold text-muted-foreground">:</span>
                <input
                  dir="ltr"
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={timeMin}
                  onChange={e => setTimeMin(clampMin(e.target.value))}
                  placeholder="00"
                  aria-label="דקות"
                  className="w-14 h-11 text-center text-lg font-bold font-mono bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void addSupplement()} disabled={!name.trim() || savingId === "new"}>
                {savingId === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                הוסף תוסף
              </Btn>
              <Btn variant="outline" onClick={() => setShowCreate(false)} disabled={savingId === "new"}>ביטול</Btn>
            </div>
        </Dialog>
      )}
    </div>
  );
}
