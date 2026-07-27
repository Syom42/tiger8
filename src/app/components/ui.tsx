import { Component, useEffect, useRef, type ReactNode, type ElementType, type MouseEventHandler } from "react";

export function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ");
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("bg-card border border-border rounded-lg", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{children}</h2>
      {action && <div className="text-xs text-muted-foreground">{action}</div>}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type BtnSize = "xs" | "sm" | "md" | "lg";

export function Btn({
  children, variant = "primary", size = "md", onClick, className, disabled, fullWidth,
}: {
  children: ReactNode; variant?: BtnVariant; size?: BtnSize;
  onClick?: MouseEventHandler<HTMLButtonElement>; className?: string; disabled?: boolean; fullWidth?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const vs: Record<BtnVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "text-foreground hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-border text-foreground hover:bg-accent",
  };
  const ss: Record<BtnSize, string> = {
    xs: "h-7 px-2.5 text-xs",
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-6 text-base",
  };
  return (
    <button
      className={cn(base, vs[variant], ss[size], fullWidth && "w-full", className)}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export type BadgeVariant = "default" | "gold" | "green" | "red" | "muted" | "blue";

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: BadgeVariant }) {
  const vs: Record<BadgeVariant, string> = {
    default: "bg-secondary text-secondary-foreground",
    gold: "text-[var(--gold)] bg-[var(--gold)]/12",
    green: "text-primary bg-primary/12",
    red: "text-destructive bg-destructive/12",
    muted: "bg-muted text-muted-foreground",
    blue: "text-sky-600 bg-sky-600/10 dark:text-sky-400 dark:bg-sky-400/10",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", vs[variant])}>
      {children}
    </span>
  );
}

export function StatCard({
  label, value, sub, icon: Icon, accent, mono = true,
}: {
  label: string; value: string; sub?: string;
  icon?: ElementType; accent?: "gold" | "green" | "red"; mono?: boolean;
}) {
  const color = accent === "gold" ? "text-[var(--gold)]" : accent === "green" ? "text-primary" : accent === "red" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1.5 leading-none">{label}</p>
          <p className={cn("text-2xl font-bold leading-none", mono && "font-mono tabular-nums", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1.5 leading-none">{sub}</p>}
        </div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      </div>
    </Card>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn("relative w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring", value ? "bg-primary" : "bg-muted")}
    >
      <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", value ? "right-1" : "right-5")} />
    </button>
  );
}

export function Dialog({
  children,
  labelId,
  onClose,
  className,
}: {
  children: ReactNode;
  labelId: string;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])") ?? []);
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    focusable[nextIndex].focus();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1} onKeyDown={trapFocus} className={cn("w-full bg-card border border-border rounded-lg", className)}>
        {children}
      </div>
    </div>
  );
}

export class ScreenErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Tiger8 screen render failed", error, info);
  }

  render() {
    if (this.state.failed) {
      return <div className="p-6"><Card className="max-w-md p-5 space-y-3"><h1 className="text-lg font-semibold">לא ניתן להציג את המסך</h1><p className="text-sm text-muted-foreground">רענן את הדף כדי לנסות שוב.</p><Btn onClick={() => window.location.reload()}>רענן</Btn></Card></div>;
    }
    return this.props.children;
  }
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

export function EmptyState({ icon: Icon, title, desc, action }: {
  icon: ElementType; title: string; desc: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{desc}</p>
      {action}
    </div>
  );
}
