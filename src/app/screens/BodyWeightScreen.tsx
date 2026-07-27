import { useState } from "react";
import { Scale, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn, Card, Btn, StatCard, EmptyState } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { BodyWeightApiError, saveBodyWeight } from "../../features/bodyweight/api";

export function BodyWeightScreen({ data, onSaved }: { data: BootstrapData | null; onSaved: () => Promise<void> }) {
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const entries = (data?.weight ?? []).map(entry => ({
    date: entry.date,
    w: Number(entry.weight),
  })).filter(entry => Number.isFinite(entry.w));
  const latest = entries.at(-1)?.w;
  const first = entries[0]?.w;
  const change = latest !== undefined && first !== undefined ? latest - first : 0;

  const handleSave = async () => {
    const value = Number(newWeight);
    if (!Number.isFinite(value) || value <= 0 || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      await saveBodyWeight(value);
      await onSaved();
      setNewWeight("");
      setMessage("המדידה נשמרה בהצלחה");
    } catch (error) {
      setMessage(error instanceof BodyWeightApiError
        ? "לא ניתן היה לשמור את המדידה. נסה שוב."
        : "אירעה שגיאה בשמירת המדידה.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold">משקל גוף</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="משקל נוכחי" value={latest?.toFixed(1) ?? "--"} sub="ק״ג" icon={Scale} accent="green" />
        <StatCard label="מדידה ראשונה" value={first?.toFixed(1) ?? "--"} sub="ק״ג" />
        <StatCard label="שינוי מצטבר" value={entries.length > 1 ? `${change > 0 ? "+" : ""}${change.toFixed(1)}` : "--"} sub="ק״ג" accent={change > 0 ? "green" : undefined} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium">מגמת משקל</p>
          <span className="text-sm font-mono font-bold text-primary">{entries.length} מדידות</span>
        </div>
        <p className="text-xs text-muted-foreground">מוצגים רק נתונים שנשמרו בחשבון שלך.</p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState icon={Scale} title="אין עדיין מדידות" desc="הוסף מדידת משקל ראשונה כדי לעקוב אחרי המגמה שלך." />
      ) : (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">כל המדידות</h3>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={entries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "Heebo" }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, direction: "rtl" }}
                  formatter={(v: unknown) => [`${v} ק״ג`, "משקל"]}
                />
                <Area type="monotone" dataKey="w" stroke="var(--primary)" strokeWidth={2} fill="url(#wGrad)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">הוסף מדידה</h3>
        <div className="flex gap-2">
          <input
            dir="ltr"
            type="number"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="83.2"
            className="flex-1 h-9 bg-input-background border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Btn variant="primary" size="md" onClick={() => void handleSave()} disabled={!newWeight || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
          </Btn>
        </div>
        {message && <p className={cn("text-xs mt-2", message === "המדידה נשמרה בהצלחה" ? "text-primary" : "text-destructive")}>{message}</p>}
      </Card>
    </div>
  );
}
