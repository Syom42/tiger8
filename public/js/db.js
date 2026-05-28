// ============ DATA LAYER (relational Postgres, cookie auth) ============

const DB_DEFAULTS = {
  user: null,
  workouts: [],
  plans: [],
  weightLog: [],
  weekPlan: { sun:'', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'' },
  prs: {},
  exercises: null,
  routineTemplates: null,
  supplements: [],
};

let DB = { ...DB_DEFAULTS };
let LOADED = null;
let _isUnloading = false;

// ─── Fetch helper (cookie auth) ──────────────────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    // keepalive: true tells the browser to complete this request even if the page unloads
    keepalive: _isUnloading,
  });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  return res;
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadDB() {
  try {
    const [profile, serverExercises, workouts, plans, weekPlan, prs, weightLog, supplements] =
      await Promise.all([
        apiFetch('/api/profile').then(r => r?.ok ? r.json() : {}),
        apiFetch('/api/exercises').then(r => r?.ok ? r.json() : []),
        apiFetch('/api/workouts').then(r => r?.ok ? r.json() : []),
        apiFetch('/api/plans').then(r => r?.ok ? r.json() : []),
        apiFetch('/api/week-plan').then(r => r?.ok ? r.json() : { sun:'', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'' }),
        apiFetch('/api/prs').then(r => r?.ok ? r.json() : {}),
        apiFetch('/api/weight').then(r => r?.ok ? r.json() : []),
        apiFetch('/api/supplements').then(r => r?.ok ? r.json() : []),
      ]);

    DB.user = (profile && profile.name != null)
      ? { name: profile.name, age: profile.age, height: profile.height, goal: profile.goal, joined: profile.joined_at }
      : null;

    DB.exercises = serverExercises.length
      ? serverExercises.map(e => ({ id: e.id, name: e.name, muscle: e.muscle, desc: e.description, isCustom: e.is_custom }))
      : null;

    DB.workouts = workouts.map(w => ({
      id: w.id, name: w.name, muscles: w.muscles, date: w.date, duration: w.duration,
      exercises: (w.exercises || []).filter(Boolean).map(ex => ({
        name: ex.exercise_name, restSeconds: ex.rest_seconds,
        sets: (ex.sets || []).filter(Boolean).map(s => ({ weight: s.weight, reps: s.reps, done: s.done })),
      })),
    }));

    DB.plans = plans.map(p => ({
      id: p.id, name: p.name, desc: p.description,
      exercises: (p.exercises || []).filter(Boolean).map(e => ({ name: e.exercise_name, restSeconds: e.rest_seconds })),
    }));

    DB.weekPlan = weekPlan;
    DB.prs = prs;
    DB.weightLog = weightLog.map(w => ({ id: w.id, weight: w.weight, date: w.date, note: w.note }));
    DB.supplements = supplements.map(s => ({
      id: s.id, name: s.name, dose: s.dose, time: s.time, enabled: s.enabled,
      takenDates: s.taken_dates || [],
    }));

  } catch (e) {
    console.warn('loadDB failed', e);
    DB = { ...DB_DEFAULTS };
  }

  migrateDB();
  LOADED = JSON.parse(JSON.stringify(DB));

  if (!LOADED.exercises?.length && DB.exercises?.length) {
    _dirty.add('exercises');
    saveDB();
  }
}

function migrateDB() {
  Object.keys(DB_DEFAULTS).forEach(key => {
    if (DB[key] === undefined) DB[key] = DB_DEFAULTS[key];
  });
  seedExercises();
}

// ─── Save (debounced) ─────────────────────────────────────────────────────────

const _dirty = new Set();
let _saveTimer = null;
let _saving = false;

function saveDB() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSave, 250);
}

async function flushSave() {
  if (_saving) { _saveTimer = setTimeout(flushSave, 150); return; }
  if (!_dirty.size) return;
  _saving = true;
  const keys = [..._dirty];
  _dirty.clear();
  try {
    await Promise.allSettled(keys.map(key => syncSection(key)));
    LOADED = JSON.parse(JSON.stringify(DB));
  } finally {
    _saving = false;
    // If more dirty keys arrived while we were saving, flush again
    if (_dirty.size) saveDB();
  }
}

// Flush on tab hide (mobile background) and on page unload (refresh/navigate away)
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { clearTimeout(_saveTimer); flushSave(); }
});
window.addEventListener('beforeunload', () => {
  _isUnloading = true;   // enables keepalive on all subsequent fetch calls
  clearTimeout(_saveTimer);
  flushSave();           // fire-and-forget; keepalive ensures requests complete after unload
});

// ─── Section sync ─────────────────────────────────────────────────────────────

async function syncSection(key) {
  try {
    if      (key === 'user')        await syncProfile();
    else if (key === 'weekPlan')    await syncWeekPlan();
    else if (key === 'prs')         await syncPrs();
    else if (key === 'exercises')   await syncExercises();
    else if (key === 'workouts')    await syncWorkouts();
    else if (key === 'plans')       await syncPlans();
    else if (key === 'weightLog')   await syncWeightLog();
    else if (key === 'supplements') await syncSupplements();
  } catch (e) { console.warn('syncSection(' + key + ') failed', e); }
}

async function syncProfile() {
  if (!DB.user) return;
  await apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ name: DB.user.name, age: DB.user.age, height: DB.user.height, goal: DB.user.goal }),
  });
}

async function syncWeekPlan() {
  await apiFetch('/api/week-plan', { method: 'PUT', body: JSON.stringify(DB.weekPlan) });
}

async function syncPrs() {
  await apiFetch('/api/prs', { method: 'PUT', body: JSON.stringify(DB.prs) });
}

async function syncExercises() {
  const custom = (DB.exercises || []).filter(e => e.isCustom);
  const loadedCustom = (LOADED?.exercises || []).filter(e => e.isCustom);
  const currentIds = new Set(custom.map(e => e.id));

  for (const ex of custom) {
    await apiFetch('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ id: ex.id, name: ex.name, muscle: ex.muscle, description: ex.desc }),
    });
  }
  for (const ex of loadedCustom) {
    if (!currentIds.has(ex.id)) {
      await apiFetch('/api/exercises', { method: 'DELETE', body: JSON.stringify({ id: ex.id }) });
    }
  }
}

async function syncWorkouts() {
  const loadedIds = new Set((LOADED?.workouts || []).map(w => String(w.id)));
  const currentIds = new Set(DB.workouts.map(w => String(w.id)));

  for (const w of DB.workouts) {
    if (!loadedIds.has(String(w.id))) {
      await apiFetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify({ id: w.id, name: w.name, muscles: w.muscles, date: w.date, duration: w.duration, exercises: w.exercises }),
      });
    }
  }
  for (const id of loadedIds) {
    if (!currentIds.has(id)) {
      await apiFetch('/api/workouts', { method: 'DELETE', body: JSON.stringify({ id: parseInt(id, 10) }) });
    }
  }
}

async function syncPlans() {
  const loadedIds = new Set((LOADED?.plans || []).map(p => String(p.id)));
  const currentIds = new Set(DB.plans.map(p => String(p.id)));

  for (const p of DB.plans) {
    await apiFetch('/api/plans', {
      method: 'POST',
      body: JSON.stringify({ id: p.id, name: p.name, description: p.desc, exercises: p.exercises }),
    });
  }
  for (const id of loadedIds) {
    if (!currentIds.has(id)) {
      await apiFetch('/api/plans', { method: 'DELETE', body: JSON.stringify({ id: parseInt(id, 10) }) });
    }
  }
}

async function syncWeightLog() {
  const loadedIds = new Set((LOADED?.weightLog || []).map(w => w.id).filter(Boolean));
  const currentIds = new Set(DB.weightLog.map(w => w.id).filter(Boolean));

  for (const id of loadedIds) {
    if (!currentIds.has(id)) {
      await apiFetch('/api/weight', { method: 'DELETE', body: JSON.stringify({ id }) });
    }
  }
  for (const entry of DB.weightLog) {
    if (!entry.id) {
      const res = await apiFetch('/api/weight', {
        method: 'POST',
        body: JSON.stringify({ weight: entry.weight, date: entry.date, note: entry.note || null }),
      });
      if (res?.ok) { const data = await res.json(); entry.id = data.id; }
    }
  }
}

async function syncSupplements() {
  const loadedIds = new Set((LOADED?.supplements || []).map(s => s.id));
  const currentIds = new Set(DB.supplements.map(s => s.id));

  for (const s of DB.supplements) {
    await apiFetch('/api/supplements', {
      method: 'POST',
      body: JSON.stringify({ id: s.id, name: s.name, dose: s.dose, time: s.time, enabled: s.enabled }),
    });
    const loadedSupp = (LOADED?.supplements || []).find(ls => ls.id === s.id);
    const loadedDates = new Set(loadedSupp?.takenDates || []);
    const currentDates = new Set(s.takenDates || []);
    for (const date of currentDates) {
      if (!loadedDates.has(date)) await apiFetch('/api/supplements', { method: 'PUT', body: JSON.stringify({ id: s.id, date, taken: true }) });
    }
    for (const date of loadedDates) {
      if (!currentDates.has(date)) await apiFetch('/api/supplements', { method: 'PUT', body: JSON.stringify({ id: s.id, date, taken: false }) });
    }
  }
  for (const id of loadedIds) {
    if (!currentIds.has(id)) await apiFetch('/api/supplements', { method: 'DELETE', body: JSON.stringify({ id }) });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const db = {
  update(fn, { immediate = false } = {}) {
    const snapshot = JSON.parse(JSON.stringify(DB));
    fn(DB);
    for (const key of Object.keys(DB_DEFAULTS)) {
      if (JSON.stringify(DB[key]) !== JSON.stringify(snapshot[key])) _dirty.add(key);
    }
    if (immediate) {
      clearTimeout(_saveTimer);
      flushSave();
    } else {
      saveDB();
    }
  },
};

async function logout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  window.location.href = '/login.html';
}
