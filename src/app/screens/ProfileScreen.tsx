import { useState } from "react";
import { User, Edit3, Sun, Moon, Settings, Bell, Scale, WifiOff, Check, X, Loader2 } from "lucide-react";
import { cn, Card, Btn, Badge, Toggle, Dialog } from "../components/ui";
import { type BootstrapData } from "../../lib/api";
import { ProfileApiError, saveProfile } from "../../features/profile/api";

export function ProfileScreen({
  isDark,
  setIsDark,
  offlineMode,
  data,
  onSaved,
}: {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  offlineMode: boolean;
  data: BootstrapData | null;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data?.profile.name ?? "");
  const [age, setAge] = useState(data?.profile.age?.toString() ?? "");
  const [height, setHeight] = useState(data?.profile.height?.toString() ?? "");
  const [goal, setGoal] = useState(data?.profile.goal ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem("tiger8_notif_enabled") !== "false");
  const latestWeight = data?.weight.at(-1)?.weight;
  const displayName = data?.profile.name || data?.profile.email?.split("@")[0] || "ספורטאי";

  const toggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("tiger8_notif_enabled", String(enabled));
    if (enabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const openEditor = () => {
    setName(data?.profile.name ?? "");
    setAge(data?.profile.age?.toString() ?? "");
    setHeight(data?.profile.height?.toString() ?? "");
    setGoal(data?.profile.goal ?? "");
    setError(null);
    setEditing(true);
  };

  const persistProfile = async () => {
    if (saving) return;
    const parsedAge = age.trim() ? Number(age) : null;
    const parsedHeight = height.trim() ? Number(height) : null;
    if ((parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge <= 0)) ||
      (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight <= 0))) {
      setError("יש להזין גיל וגובה תקינים.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        name: name.trim() || null,
        age: parsedAge,
        height: parsedHeight,
        goal: goal.trim() || null,
      });
      await onSaved();
      setEditing(false);
    } catch (requestError) {
      setError(requestError instanceof ProfileApiError ? "לא ניתן היה לשמור את הפרופיל. נסה שוב." : "אירעה שגיאה בשמירת הפרופיל.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">פרופיל והגדרות</h1>

      {/* User card */}
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg leading-tight">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{data?.workouts.length ?? 0} אימונים נשמרו בחשבון</p>
          </div>
          <Btn variant="outline" size="sm" onClick={openEditor}>
            <Edit3 className="w-3.5 h-3.5" />
            ערוך
          </Btn>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center">
          <div>
            <p className="text-2xl font-bold font-mono text-primary">{data?.profile.height ?? "--"}</p>
            <p className="text-xs text-muted-foreground">גובה (ס״מ)</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{latestWeight ?? "--"}</p>
            <p className="text-xs text-muted-foreground">משקל (ק״ג)</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono">{data?.profile.age ?? "--"}</p>
            <p className="text-xs text-muted-foreground">גיל</p>
          </div>
        </div>
      </Card>

      {/* Settings list */}
      <Card className="divide-y divide-border overflow-hidden">
        {[
          {
            label: "מצב לילה",
            desc: isDark ? "ממשק כהה — פעיל" : "ממשק בהיר — פעיל",
            icon: isDark ? Moon : Sun,
            action: <Toggle value={isDark} label="מצב לילה" onChange={setIsDark} />,
          },
          {
            label: "שפה",
            desc: "עברית (Hebrew)",
            icon: Settings,
            action: <Badge variant="muted">עברית</Badge>,
          },
          {
            label: "התראות",
            desc: notificationsEnabled ? "תזכורות אימון ותוספים פעילות" : "התראות כבויות",
            icon: Bell,
            action: <Toggle value={notificationsEnabled} label="התראות" onChange={toggleNotifications} />,
          },
          {
            label: "יחידות משקל",
            desc: "קילוגרם",
            icon: Scale,
            action: <Badge variant="muted">ק״ג</Badge>,
          },
          {
            label: "מצב חיבור",
            desc: offlineMode ? "מוצגים נתונים שמורים לקריאה בלבד" : "מחובר ומסונכרן",
            icon: WifiOff,
            action: <Badge variant={offlineMode ? "muted" : "green"}>{offlineMode ? "לא מקוון" : "מחובר"}</Badge>,
          },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            {item.action}
          </div>
        ))}
      </Card>

      {editing && (
        <Dialog labelId="edit-profile-title" onClose={() => { if (!saving) setEditing(false); }} className="max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="edit-profile-title" className="text-lg font-semibold">עריכת פרופיל</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="sr-only" htmlFor="profile-name">שם</label>
            <input id="profile-name" value={name} onChange={event => setName(event.target.value)} placeholder="שם" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="profile-age">גיל</label>
              <input id="profile-age" dir="ltr" type="number" inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} placeholder="גיל" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <label className="sr-only" htmlFor="profile-height">גובה בסנטימטרים</label>
              <input id="profile-height" dir="ltr" type="number" inputMode="decimal" value={height} onChange={event => setHeight(event.target.value)} placeholder="גובה בס״מ" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <label className="sr-only" htmlFor="profile-goal">מטרת אימון</label>
            <input id="profile-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="מטרה, לדוגמה כוח או מסה" className="w-full h-10 bg-input-background border border-border rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Btn variant="primary" className="flex-1" onClick={() => void persistProfile()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                שמור
              </Btn>
              <Btn variant="outline" onClick={() => setEditing(false)} disabled={saving}>ביטול</Btn>
            </div>
        </Dialog>
      )}
    </div>
  );
}
