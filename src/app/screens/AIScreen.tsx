import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { cn, Btn } from "../components/ui";
import { CoachApiError, sendCoachMessage, type CoachMessage } from "../../features/coach/api";

// ─── AI Coach ─────────────────────────────────────────────────────────────────

export function AIScreen() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "שלום. אני כאן כדי לעזור לך לתכנן אימונים, התאוששות והתקדמות. על מה תרצה לעבוד?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const question = input.trim();
    if (!question || typing) return;

    const userMsg = { role: "user" as const, text: question };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setTyping(true);

    try {
      const coachMessages: CoachMessage[] = [
        ...nextMessages.map(message => ({
          role: message.role === "ai" ? "assistant" as const : "user" as const,
          content: message.text,
        })),
      ];
      const response = await sendCoachMessage(coachMessages);
      setMessages(previous => [...previous, { role: "ai", text: response }]);
    } catch (requestError) {
      const message = requestError instanceof CoachApiError && requestError.status === 503
        ? "מאמן ה-AI עדיין לא הוגדר בסביבת הפיתוח. הוסף GROQ_API_KEY ב-Vercel Development ונסה שוב."
        : "לא ניתן היה לקבל תשובה ממאמן ה-AI. נסה שוב בעוד רגע.";
      setError(message);
    } finally {
      setTyping(false);
    }
  };

  const suggestions = ["הצע תרגיל חלופי", "ניתח את השיאים שלי", "כמה מנוחה אני צריך?", "בנה לי מיקרו-מחזור"];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-2xl">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold">מאמן AI</h1>
            <p className="text-xs text-muted-foreground">עצות אימון והתאוששות מותאמות לשאלה שלך</p>
          </div>
          <div className="mr-auto flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", error ? "bg-destructive" : "bg-primary")} />
            <span className="text-xs text-muted-foreground">{error ? "נדרשת הגדרה" : "מחובר"}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-start" : "justify-end")}>
            <div className={cn(
              "max-w-[82%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-end">
            <div className="bg-primary/15 text-primary rounded-lg px-4 py-2.5 text-sm flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              מעבד...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/25 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-5 pb-2 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-5 pt-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="שאל על אימון, תזונה, התאוששות..."
            className="flex-1 h-10 bg-input-background border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Btn variant="primary" size="md" onClick={() => void send()} disabled={!input.trim() || typing}>
            {typing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Btn>
        </div>
      </div>
    </div>
  );
}
