// ============ DATA LAYER (cloud-backed) ============
// User data lives in Vercel Postgres as a JSONB blob keyed by user_id.
// Public surface (loadDB, db.update) matches the old localStorage version,
// except loadDB is now async — callers must await it during boot.

const DB_DEFAULTS = {
  user: null,
  workouts: [],
  plans: [],
  weightLog: [],
  weekPlan: { sun:'', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'' },
  prs: {},
  exercises: null,
  routineTemplates: null,
  supplements: []
  // note: gemini API key stays in localStorage under 'ironlog_gemini_key' (per-device).
};

let DB = { ...DB_DEFAULTS };

function migrateDB() {
  Object.keys(DB_DEFAULTS).forEach(key => {
    if (DB[key] === undefined) DB[key] = DB_DEFAULTS[key];
  });
  seedExercises();
}

async function loadDB() {
  try {
    const res = await fetch('/api/data', { credentials: 'same-origin' });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    if (!res.ok) throw new Error('load failed: ' + res.status);
    const { data } = await res.json();
    DB = (data && typeof data === 'object' && Object.keys(data).length) ? data : { ...DB_DEFAULTS };
  } catch (e) {
    console.warn('loadDB failed', e);
    DB = { ...DB_DEFAULTS };
  }
  migrateDB();
}

let saveTimer = null;
let savePending = false;
function saveDB() {
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 600);
}

async function flushSave() {
  if (!savePending) return;
  savePending = false;
  try {
    await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ data: DB }),
    });
  } catch (e) {
    console.warn('saveDB failed', e);
    savePending = true;
  }
}

// Best-effort flush on tab hide so debounced writes don't get lost on quick navigations.
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && savePending) {
    clearTimeout(saveTimer);
    flushSave();
  }
});

const db = {
  update(fn) {
    fn(DB);
    saveDB();
  }
};

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
  window.location.href = '/login.html';
}
