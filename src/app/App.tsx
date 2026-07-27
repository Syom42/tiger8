import { useState, useEffect, type ElementType } from "react";
import {
  LayoutDashboard, Dumbbell, CalendarDays, Clock, Trophy,
  Scale, Pill, User, Bot, Play, Sun, Moon, X, WifiOff, Activity,
  MoreHorizontal,
} from "lucide-react";
import { ApiError, getBootstrapData, type BootstrapData, type Plan } from "../lib/api";
import { cn, Btn, Badge, ScreenErrorBoundary } from "./components/ui";
import { readStoredValue, writeStoredValue, clearStoredValue, BOOTSTRAP_CACHE_KEY, WORKOUT_DRAFT_KEY } from "./lib/storage";
import type { Screen, WorkoutDraft } from "./lib/types";

import { DashboardScreen } from "./screens/DashboardScreen";
import { PlansScreen } from "./screens/PlansScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { RecordsScreen } from "./screens/RecordsScreen";
import { BodyWeightScreen } from "./screens/BodyWeightScreen";
import { SupplementsScreen } from "./screens/SupplementsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AIScreen } from "./screens/AIScreen";

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "plans", label: "תוכניות", icon: CalendarDays },
  { id: "history", label: "היסטוריה", icon: Clock },
  { id: "records", label: "שיאים", icon: Trophy },
  { id: "bodyweight", label: "משקל גוף", icon: Scale },
  { id: "supplements", label: "תוספים", icon: Pill },
  { id: "ai", label: "מאמן AI", icon: Bot },
  { id: "profile", label: "פרופיל", icon: User },
];

const MOBILE_NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "dashboard", label: "בקרה", icon: LayoutDashboard },
  { id: "history", label: "היסטוריה", icon: Clock },
  { id: "records", label: "שיאים", icon: Trophy },
];

const MOBILE_MORE_NAV: { id: Screen; label: string; icon: ElementType }[] = [
  { id: "plans", label: "תוכניות", icon: CalendarDays },
  { id: "bodyweight", label: "משקל גוף", icon: Scale },
  { id: "supplements", label: "תוספים", icon: Pill },
  { id: "ai", label: "מאמן AI", icon: Bot },
  { id: "profile", label: "פרופיל", icon: User },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<Plan | null>(null);
  const [offlineMode, setOfflineMode] = useState(() => !navigator.onLine);
  const [bootstrapData, setBootstrapData] = useState<BootstrapData | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [showMobileMore, setShowMobileMore] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const setOnline = () => setOfflineMode(false);
    const setOffline = () => setOfflineMode(true);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  useEffect(() => {
    getBootstrapData()
      .then(data => {
        writeStoredValue(BOOTSTRAP_CACHE_KEY, data);
        setBootstrapData(data);
        setOfflineMode(false);
      })
      .catch(error => {
        if (error instanceof ApiError && error.status === 401) {
          window.location.assign("/login.html");
          return;
        }
        console.error("Failed to load Tiger8 data", error);
        const cachedData = readStoredValue<BootstrapData>(BOOTSTRAP_CACHE_KEY);
        if (cachedData) {
          setBootstrapData(cachedData);
          setOfflineMode(true);
          setBootstrapError("מוצגים נתונים שמורים. חיבור לרשת נדרש כדי לסנכרן שינויים.");
        } else {
          setBootstrapError("לא ניתן היה לטעון את הנתונים. בדוק את החיבור ונסה לרענן.");
        }
      })
      .finally(() => setBootstrapLoading(false));
  }, []);

  const refreshBootstrapData = async () => {
    try {
      const data = await getBootstrapData();
      writeStoredValue(BOOTSTRAP_CACHE_KEY, data);
      setBootstrapData(data);
      setBootstrapError(null);
      setOfflineMode(false);
    } catch (error) {
      console.error("Failed to refresh Tiger8 data", error);
      setOfflineMode(true);
      setBootstrapError("לא ניתן היה לסנכרן את השינויים. נסה שוב כאשר החיבור יחזור.");
    }
  };

  useEffect(() => {
    if (!bootstrapData || activeWorkoutPlan) return;
    const draft = readStoredValue<WorkoutDraft>(WORKOUT_DRAFT_KEY);
    const plan = draft && bootstrapData.plans.find(item => item.id === draft.planId);
    if (plan) {
      setActiveWorkoutPlan(plan);
      setScreen("workout");
    } else if (draft) {
      clearStoredValue(WORKOUT_DRAFT_KEY);
    }
  }, [activeWorkoutPlan, bootstrapData]);

  const workoutActive = activeWorkoutPlan !== null;
  const scheduledPlan = () => {
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const planId = bootstrapData?.weekPlan[dayKeys[new Date().getDay()]];
    return bootstrapData?.plans.find(plan => plan.id === Number(planId)) ?? null;
  };
  const startWorkout = () => {
    const plan = scheduledPlan();
    if (!plan || plan.exercises.length === 0) return;
    setActiveWorkoutPlan(plan);
    setScreen("workout");
  };

  const navigate = (s: Screen) => {
    if (activeWorkoutPlan) return;
    setScreen(s);
    setShowMobileMore(false);
  };

  const renderScreen = () => {
    if (activeWorkoutPlan) return <WorkoutScreen plan={activeWorkoutPlan} data={bootstrapData} onComplete={async () => {
      await refreshBootstrapData();
      setActiveWorkoutPlan(null);
      setScreen("history");
    }} />;
    switch (screen) {
      case "dashboard": return <DashboardScreen onStartWorkout={startWorkout} data={bootstrapData} loading={bootstrapLoading} canStartWorkout={Boolean(scheduledPlan()?.exercises.length)} />;
      case "plans": return <PlansScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "history": return <HistoryScreen data={bootstrapData} />;
      case "records": return <RecordsScreen data={bootstrapData} />;
      case "bodyweight": return <BodyWeightScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "supplements": return <SupplementsScreen data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "profile": return <ProfileScreen isDark={isDark} setIsDark={setIsDark} offlineMode={offlineMode} data={bootstrapData} onSaved={refreshBootstrapData} />;
      case "ai": return <AIScreen />;
      default: return <DashboardScreen onStartWorkout={startWorkout} data={bootstrapData} loading={bootstrapLoading} canStartWorkout={Boolean(scheduledPlan()?.exercises.length)} />;
    }
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-background text-foreground overflow-hidden" style={{ fontFamily: "'Heebo', sans-serif" }}>
      {/* Desktop sidebar — right side in RTL */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-l border-border flex-shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-base tracking-tight">Tiger8</span>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-border">
          <Btn
            variant="primary"
            size="sm"
            fullWidth
            onClick={startWorkout}
            disabled={workoutActive || !scheduledPlan()?.exercises.length}
          >
            <Play className="w-3.5 h-3.5" />
            {workoutActive ? "אימון פעיל" : "התחל אימון"}
          </Btn>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = !workoutActive && screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-right",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border space-y-0.5">
          {offlineMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-destructive/10 text-destructive text-xs mb-1">
              <WifiOff className="w-3.5 h-3.5" />
              מצב לא מקוון
            </div>
          )}
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? "מצב יום" : "מצב לילה"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 w-full max-w-full">
        <header className="md:hidden sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-sm">Tiger8</span>
          </div>
          <div className="flex items-center gap-2">
            {workoutActive && (
              <Badge variant="green">
                <Activity className="w-3 h-3" />
                אימון פעיל
              </Badge>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? "החלף למצב יום" : "החלף למצב לילה"}
              title={isDark ? "החלף למצב יום" : "החלף למצב לילה"}
              className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <ScreenErrorBoundary>{renderScreen()}</ScreenErrorBoundary>
        {bootstrapError && (
          <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm bg-destructive/10 border border-destructive/25 text-destructive rounded px-4 py-3 text-sm shadow-lg">
            {bootstrapError}
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-center justify-around px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {MOBILE_NAV.map(item => {
          const active = !workoutActive && screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              disabled={workoutActive}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowMobileMore(true)}
          disabled={workoutActive}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors text-muted-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] leading-none">עוד</span>
        </button>
        <button
          onClick={startWorkout}
          disabled={workoutActive || !scheduledPlan()?.exercises.length}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded min-w-[52px] transition-colors",
            workoutActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center -mt-4 border-2 border-border", workoutActive ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>
            <Play className="w-4 h-4" />
          </div>
          <span className="text-[10px] leading-none mt-1">{workoutActive ? "ממשיך" : "אימון"}</span>
        </button>
      </nav>
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setShowMobileMore(false)}>
          <div className="w-full bg-card border-t border-border p-5 space-y-2" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">ניווט נוסף</h2>
              <button type="button" onClick={() => setShowMobileMore(false)} aria-label="סגור" className="w-10 h-10 flex items-center justify-center text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {MOBILE_MORE_NAV.map(item => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} className="w-full flex items-center gap-3 px-3 py-3 rounded text-right hover:bg-accent">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
