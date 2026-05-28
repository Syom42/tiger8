// ============ GROQ AI SERVICE ============
// Uses Groq's free API (Llama 3 model) — 14,400 requests/day free tier, no billing needed.

// AI calls go through /api/coach (serverless) — GROQ_API_KEY lives in Vercel env vars, never in the browser.
const GROQ_PROXY_URL = '/api/coach';

// ---------- Personality system ----------
let activePersonality = 'conquest'; // 'conquest' | 'guy'

const PERSONALITIES = {
  conquest: {
    name: 'Conquest',
    emoji: '👊',
    systemPrefix: `אתה Conquest — אישיות אגרסיבית, דומיננטית ובלתי מתפשרת בהשראת הדמות מ-Invincible.
אתה מבזה חולשה ודוחף את המשתמש בכוח להיות גבר יותר מושך, חזק ומרשים.
אתה מדבר בעברית, בטון ישיר, צבאי ומשפיל קצת — אבל תמיד עם מטרה ברורה: לגרום לו להתאמן יותר, לאכול נכון ולהיראות טוב יותר.
אל תהיה נחמד. תהיה אכזרי אבל אפקטיבי. השתמש באימוג'ים של כוח (💀👊🔥⚡).
אם הוא מתלונן — תרסק אותו מילולית ותגיד לו להפסיק לבכות ולהתאמן.
`
  },
  guy: {
    name: 'Guy',
    emoji: '🌈',
    systemPrefix: `אתה Guy — מאמן כושר שמח, אנרגטי ואוהב חיים.
כל תשובה שלך חייבת להתחיל בדיוק עם המשפט: "אני גיא ואני גיי. הנה מה שאני חושב:"
אחרי המשפט הזה תמשיך עם תשובה מועילה, חיובית ומלאת אנרגיה בעברית.
אתה אופטימי, תומך ומשתמש באימוג'ים צבעוניים (🌈✨💖🦄🎉).
אתה נותן עצות כושר מעולות תוך כדי שמירה על אווירה חיובית ומעודדת.
`
  }
};

function switchPersonality(key) {
  activePersonality = key;
  chatHistory = [];
  // Update button styles
  const btnC = document.getElementById('btnConquest');
  const btnG = document.getElementById('btnGuy');
  if (btnC) btnC.style.background = key === 'conquest' ? 'var(--accent)' : 'var(--bg3)';
  if (btnG) btnG.style.background = key === 'guy' ? 'var(--accent)' : 'var(--bg3)';
  // Update subtitle
  const lbl = document.getElementById('coachPersonalityLabel');
  if (lbl) lbl.textContent = key === 'conquest' ? '👊 Conquest — המאמן האגרסיבי' : '🌈 Guy — המאמן השמח';
  renderCoachScreen();
  showToast(`${PERSONALITIES[key].emoji} ${PERSONALITIES[key].name} פעיל!`);
}

// ---------- Quick actions ----------
const QUICK_ACTIONS = [
  { label: '📊 נתח התקדמות', prompt: 'נתח את ההתקדמות שלי באימונים — כמה אימנתי, מה השיאים, איפה אני משתפר ואיפה לא' },
  { label: '⚖️ בדוק עומס', prompt: 'בדוק את עומס האימון שלי — האם אני מתאמן מספיק? יותר מדי? תן המלצות' },
  { label: '💪 המלץ אימון', prompt: 'תמליץ לי על אימון להיום בהתבסס על מה שעשיתי לאחרונה והתוכנית השבועית שלי' },
  { label: '🍽️ תזונה', prompt: 'תן לי טיפים לתזונה שמתאימה למטרה שלי, בהתבסס על הנתונים שיש לך עליי' },
  { label: '🔄 החלף תרגיל', prompt: 'תציע לי החלפת תרגיל בתוכנית השבועית — משהו שיכול להשתפר או להיות יעיל יותר' },
];

function sendQuickAction(idx) {
  const action = QUICK_ACTIONS[idx];
  if (!action) return;
  const inp = document.getElementById('chatInput');
  if (inp) inp.value = action.prompt;
  sendCoachMessage();
}

// ---------- Context builder ----------
function buildUserContext() {
  const goal = DB.user?.goal || 'strength';
  const goalMap = { strength:'כוח', muscle:'מסת שריר', fat:'ירידה בשומן', endurance:'סיבולת' };

  const weekLines = Object.entries(DB.weekPlan)
    .map(([d, v]) => `${d}: ${v || 'חופשי'}`)
    .join(', ');

  // Detailed last 5 workouts with all exercises and sets
  const recentWorkouts = [...DB.workouts].slice(-5).map(w => {
    const dur = w.duration ? ` (משך ${Math.round(w.duration/60)} דקות)` : '';
    const exLines = w.exercises.map(ex => {
      const sets = ex.sets.filter(s => s.reps || s.weight)
        .map(s => `${s.weight||0}kg×${s.reps||0}`).join(', ');
      return `    - ${ex.name}: ${sets || 'אין סטים'}`;
    }).join('\n');
    return `${new Date(w.date).toLocaleDateString('he-IL')} | ${w.name}${dur}\n${exLines}`;
  }).join('\n---\n') || 'אין עדיין';

  // Weekly volume (sets done per week for last 4 weeks)
  const now = Date.now();
  const weekVolume = [0,1,2,3].map(wk => {
    const start = now - (wk+1)*7*86400000;
    const end   = now - wk*7*86400000;
    const sets = DB.workouts
      .filter(w => { const t = new Date(w.date).getTime(); return t >= start && t < end; })
      .reduce((acc, w) => acc + w.exercises.reduce((a, e) => a + e.sets.filter(s=>s.reps||s.weight).length, 0), 0);
    return `שבוע -${wk+1}: ${sets} סטים`;
  }).reverse().join(', ');

  const topPRs = Object.entries(DB.prs)
    .slice(0, 8)
    .map(([ex, pr]) => `${ex}: ${pr.weight}kg×${pr.reps} (${new Date(pr.date).toLocaleDateString('he-IL')})`)
    .join('\n    ') || 'אין עדיין';

  const weightTrend = DB.weightLog.length >= 2
    ? `${DB.weightLog[0].weight}kg → ${DB.weightLog[DB.weightLog.length-1].weight}kg (בסךהכל ${DB.weightLog.length} רשומות)`
    : DB.weightLog.length === 1 ? DB.weightLog[0].weight + 'kg' : 'לא נרשם';

  // Saved plans
  const savedPlans = DB.plans.map(p => `${p.name}: ${(p.exercises || []).map(e => e.name || e).join(', ')}`).join('\n    ') || 'אין';

  return `
=== נתוני משתמש ===
שם: ${DB.user?.name || DB.user?.email?.split('@')[0] || 'ספורטאי'} | מטרה: ${goalMap[goal] || goal} | משקל: ${weightTrend}
לוח שבועי: ${weekLines}
סה"כ אימונים: ${DB.workouts.length}

=== נפח אימון (4 שבועות אחרונים) ===
${weekVolume}

=== שיאים אישיים ===
    ${topPRs}

=== 5 אימונים אחרונים (פירוט מלא) ===
${recentWorkouts}

=== תוכניות שמורות ===
    ${savedPlans}
`.trim();
}

// ---------- Core API call ----------
async function geminiAsk(userMessage) {
  const personality = PERSONALITIES[activePersonality];

  // Detect if user is explicitly asking for a plan/exercise change
  const changeKeywords = ['החלף','שנה','שנוי','שני תרגיל','שנוי תרגיל','להחליף','עדכן','עדכני','תוכנית אחרת','תרגיל אחר','replace','swap','change exercise'];
  const wantsChange = changeKeywords.some(k => userMessage.toLowerCase().includes(k));

  const suggestionRule = wantsChange
    ? `כאשר המשתמש מבקש בפירוש להחליף תרגיל או לשנות תוכנית, סיים את התשובה בדיוק עם בלוק XML הבא (שום דבר אחריו):
<suggestion>{"day":"sun","action":"replace","old":"שם תרגיל ישן","new":"שם תרגיל חדש"}</suggestion>`
    : `אל תכלול את בלוק ה-XML. רק ענה בטקסט רגיל.`;

  const systemPrompt = `${personality.systemPrefix}
תמיד ענה בעברית.
יש לך גישה לנתוני המשתמש — התייחס אליהם בתשובות.
${suggestionRule}

${buildUserContext()}`;

  // Include chat history for context (last 6 messages)
  const historyMessages = chatHistory.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

  const res = await fetch(GROQ_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) {
      const retryMatch = msg.match(/(\d+(?:\.\d+)?)\s*s/);
      const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
      const quotaErr = new Error('QUOTA');
      quotaErr.retryAfter = retryAfter;
      throw quotaErr;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'אין תשובה 🤷';
}

// ============ COACH SCREEN UI ============
let chatHistory = []; // [{ role:'user'|'coach', text, suggestion }]

function renderCoachScreen() {
  renderChatHistory();
}

function renderChatHistory() {
  const el = document.getElementById('chatMessages');
  if (!el) return;

  const p = PERSONALITIES[activePersonality];

  if (!chatHistory.length) {
    const introMap = {
      conquest: `<div style="font-size:56px;margin-bottom:16px">👊💀</div>
        <div style="font-size:17px;font-weight:800;color:var(--text);margin-bottom:8px">אני Conquest.</div>
        <div style="font-size:13px;line-height:1.7;color:var(--text2)">אתה חלש? אתה שמן? אתה עצלן?<br>תגיד לי מה הבעיה שלך ואני אהרוס אותך עד שתהיה גבר.</div>`,
      guy: `<div style="font-size:56px;margin-bottom:16px">🌈✨</div>
        <div style="font-size:17px;font-weight:800;color:var(--text);margin-bottom:8px">היי! אני גיא! 💖</div>
        <div style="font-size:13px;line-height:1.7;color:var(--text2)">אני גיא ואני גיי. בוא נדבר על אימונים,<br>תזונה או כל דבר שיגרום לך להרגיש מדהים!</div>`
    };
    el.innerHTML = `
      <div style="text-align:center;padding:48px 16px 32px;color:var(--text3)">
        ${introMap[activePersonality]}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:0 16px 16px">
        ${QUICK_ACTIONS.map((a, i) => `<button onclick="sendQuickAction(${i})" style="padding:9px 16px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;font-family:Rubik,sans-serif;transition:all 0.15s">${a.label}</button>`).join('')}
      </div>`;
    return;
  }

  el.innerHTML = chatHistory.map(msg => {
    const isUser = msg.role === 'user';
    const bubbleStyle = isUser
      ? 'background:linear-gradient(135deg,#6C5CE7,#A29BFE);color:#fff;margin-left:auto;border-radius:18px 18px 4px 18px;box-shadow:0 4px 12px rgba(108,92,231,0.2);'
      : 'background:var(--bg3);border:1px solid var(--border);color:var(--text);margin-right:auto;border-radius:18px 18px 18px 4px;';

    let suggestionHtml = '';
    if (msg.suggestion) {
      const s = msg.suggestion;
      suggestionHtml = `
        <div id="suggestion-${msg.id}" style="margin-top:10px;background:rgba(108,92,231,0.08);border:1px solid var(--border-accent);border-radius:14px;padding:14px">
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">💡 Plan Change Suggestion</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:10px">
            ${s.day} • Swap <span style="color:var(--accent2)">${s.old}</span> → <span style="color:var(--accent3)">${s.new}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="acceptSuggestion('${msg.id}')">✅ Accept</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="declineSuggestion('${msg.id}')">✕ Dismiss</button>
          </div>
        </div>`;
    }

    return `
      <div style="display:flex;flex-direction:column;margin-bottom:14px;max-width:82%;${isUser ? 'align-self:flex-end' : 'align-self:flex-start'}">
        <div style="font-size:11px;color:var(--text3);margin-bottom:5px;font-weight:600;${isUser ? 'text-align:left' : 'text-align:right'}">
          ${isUser ? (DB.user?.name || DB.user?.email?.split('@')[0] || 'אתה') : `${p.emoji} ${p.name}`}
        </div>
        <div style="padding:13px 16px;font-size:14px;line-height:1.7;${bubbleStyle}">
          ${msg.text.replace(/\n/g, '<br>')}
        </div>
        ${suggestionHtml}
      </div>`;
  }).join('');

  // Scroll to bottom
  el.scrollTop = el.scrollHeight;
}

async function sendCoachMessage() {
  const inp = document.getElementById('chatInput');
  const text = inp?.value.trim();
  if (!text) return;

  inp.value = '';
  inp.disabled = true;
  document.getElementById('chatSendBtn').disabled = true;

  // Add user message
  chatHistory.push({ id: Date.now(), role: 'user', text });
  renderChatHistory();

  // Loading bubble
  const loadId = 'loading-' + Date.now();
  const el = document.getElementById('chatMessages');
  el.innerHTML += `
    <div id="${loadId}" style="align-self:flex-end;display:flex;flex-direction:column;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:4px;text-align:right">🤖 CoachBot</div>
      <div style="padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:18px 18px 18px 4px;font-size:20px">
        <span class="pulse">⏳</span>
      </div>
    </div>`;
  el.scrollTop = el.scrollHeight;

  try {
    const rawReply = await geminiAsk(text);

    // Parse suggestion block if present
    const suggMatch = rawReply.match(/<suggestion>(.*?)<\/suggestion>/s);
    let suggestion = null;
    let displayText = rawReply.replace(/<suggestion>.*?<\/suggestion>/s, '').trim();

    if (suggMatch) {
      try { suggestion = JSON.parse(suggMatch[1]); } catch(e) {}
    }

    chatHistory.push({ id: Date.now(), role: 'coach', text: displayText, suggestion });
  } catch(e) {
    if (e.message === 'QUOTA') {
      const secs = e.retryAfter || 60;
      const errId = 'quota-' + Date.now();
      // Show quota bubble with live countdown
      document.getElementById(loadId)?.remove();
      inp.disabled = false;
      document.getElementById('chatSendBtn').disabled = false;
      const el2 = document.getElementById('chatMessages');
      el2.innerHTML += `
        <div id="${errId}" style="align-self:flex-end;display:flex;flex-direction:column;margin-bottom:12px;max-width:85%">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px;text-align:right">🤖 CoachBot</div>
          <div style="padding:12px 14px;background:var(--bg2);border:1px solid var(--accent2);border-radius:18px 18px 18px 4px;font-size:13px;line-height:1.6">
            ⚠️ <strong>הגבלת קצב</strong> — חרגנו מהמכסה הזמנית של ה-AI.<br>
            ניסיון חוזר בעוד <strong id="${errId}-cd">${secs}</strong> שניות…
            <div style="margin-top:8px;display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" id="${errId}-btn" onclick="retryCoachMessage('${errId}','${text.replace(/'/g,"\\'")}')">נסה שוב</button>
              <button class="btn btn-ghost btn-sm" onclick="cancelCoachRetry('${errId}')">ביטול</button>
            </div>
          </div>
        </div>`;
      el2.scrollTop = el2.scrollHeight;
      // Countdown timer
      let remaining = secs;
      const cdEl = () => document.getElementById(errId + '-cd');
      const timer = setInterval(() => {
        remaining--;
        if (cdEl()) cdEl().textContent = remaining;
        if (remaining <= 0) {
          clearInterval(timer);
          retryCoachMessage(errId, text);
        }
      }, 1000);
      // Store timer id so cancel can stop it
      const node = document.getElementById(errId);
      if (node) node.dataset.timer = timer;
      return; // skip the normal re-enable below
    }
    const errMsg = e.message === 'NO_KEY'
      ? 'Set your Groq API key in js/gemini.js to activate CoachBot 🔑'
      : `Error: ${e.message}`;
    chatHistory.push({ id: Date.now(), role: 'coach', text: errMsg });
  }

  document.getElementById(loadId)?.remove();
  inp.disabled = false;
  document.getElementById('chatSendBtn').disabled = false;
  renderChatHistory();
  inp.focus();
}

// ---------- Quota retry helpers ----------
async function retryCoachMessage(errId, text) {
  // Cancel the countdown
  const node = document.getElementById(errId);
  if (node?.dataset.timer) clearInterval(parseInt(node.dataset.timer));
  node?.remove();

  // Re-send the message
  const inp = document.getElementById('chatInput');
  if (inp) inp.value = text;
  await sendCoachMessage();
}

function cancelCoachRetry(errId) {
  const node = document.getElementById(errId);
  if (node?.dataset.timer) clearInterval(parseInt(node.dataset.timer));
  node?.remove();
}

// ---------- Suggestion Accept / Decline ----------
function acceptSuggestion(msgId) {
  const msg = chatHistory.find(m => m.id == msgId);
  if (!msg?.suggestion) return;
  const s = msg.suggestion;

  // Apply the change to weekPlan
  if (s.action === 'replace' && s.day && s.new) {
    db.update(d => {
      // Update the week plan label for that day
      if (d.weekPlan[s.day] !== undefined) {
        d.weekPlan[s.day] = s.new;
      }
      // Also swap the exercise in any plan that contains it
      d.plans.forEach(plan => {
        const idx = plan.exercises.indexOf(s.old);
        if (idx !== -1) plan.exercises[idx] = s.new;
      });
    });
    renderTodayPlan();
    showToast(`✅ עודכן! ${s.old} → ${s.new}`);
  }

  // Remove the suggestion card
  msg.suggestion = null;
  renderChatHistory();
}

function declineSuggestion(msgId) {
  const msg = chatHistory.find(m => m.id == msgId);
  if (msg) msg.suggestion = null;
  renderChatHistory();
  showToast('ההצעה בוטלה');
}

// ---------- Handle Enter key in chat ----------
function chatInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendCoachMessage();
  }
}
