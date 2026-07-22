// ============ DATA LAYER (relational Postgres, cookie auth) ============

const DB_DEFAULTS = {
  user: { email: '', name: '', age: null, height: null, goal: 'strength', joined: null },
  workouts: [],
  plans: [],
  weightLog: [],
  weekPlan: { sun:null, mon:null, tue:null, wed:null, thu:null, fri:null, sat:null },
  prs: {},
  exercises: null,
  routineTemplates: null,
  supplements: [],
};

let DB = { ...DB_DEFAULTS };
let LOADED = null;

function normalizeWeekPlan(value) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return Object.fromEntries(days.map(day => {
    const planId = Number(value?.[day]);
    return [day, Number.isInteger(planId) && planId > 0 ? planId : null];
  }));
}

function reconcilePrsFromWorkoutHistory() {
  let changed = false;
  DB.workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps <= 0) return;

        const existing = DB.prs[exercise.name];
        if (!existing || weight > Number(existing.weight) ||
          (weight === Number(existing.weight) && reps > Number(existing.reps))) {
          DB.prs[exercise.name] = { weight, reps, date: workout.date };
          changed = true;
        }
      });
    });
  });
  return changed;
}

// ─── Fetch helper (cookie auth) ──────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${opts.method || 'GET'} ${path} → ${res.status}: ${msg}`);
  }
  return res;
}

// Fire-and-forget version for beforeunload (keepalive, no error handling)
function apiFetchBeacon(path, opts = {}) {
  fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    keepalive: true,
  }).catch(() => {});
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadDB() {
  try {
    const r = await apiFetch('/api/init');
    if (!r) return; // 401 → redirected to login

    const { profile, exercises: serverExercises, workouts, plans, weekPlan, prs, weight: weightLog, supplements } = await r.json();

    DB.user = {
      email: profile.email || '',
      name: profile.name || '',
      age: profile.age || null,
      height: profile.height || null,
      goal: profile.goal || 'strength',
      joined: profile.joined_at || new Date().toISOString(),
    };

    DB.exercises = serverExercises.length
      ? serverExercises.map(e => ({ id: e.id, name: e.name, muscle: e.muscle, desc: e.description, isCustom: e.is_custom }))
      : null;

    DB.workouts = workouts.map(w => ({
      id: Number(w.id), name: w.name, muscles: w.muscles, date: w.date, duration: w.duration,
      startTime: w.start_time || null, endTime: w.end_time || null,
      exercises: (w.exercises || []).filter(Boolean).map(ex => ({
        name: ex.exercise_name, restSeconds: ex.rest_seconds,
        sets: (ex.sets || []).filter(Boolean).map(s => ({ weight: s.weight, reps: s.reps, done: s.done })),
      })),
    }));

    DB.plans = plans.map(p => ({
      id: Number(p.id), name: p.name, desc: p.description,
      exercises: (p.exercises || []).filter(Boolean).map(e => ({ name: e.exercise_name, restSeconds: e.rest_seconds })),
    }));

    DB.weekPlan = normalizeWeekPlan(weekPlan);
    DB.prs = prs;
    DB.weightLog = weightLog.map(w => ({ id: w.id, weight: w.weight, date: w.date, note: w.note }));
    DB.supplements = supplements.map(s => ({
      id: s.id, name: s.name, dose: s.dose, time: s.time, enabled: s.enabled,
      takenDates: s.taken_dates || [],
    }));

    console.log('[Tiger8] loadDB complete:', { plans: DB.plans.length, workouts: DB.workouts.length, user: DB.user.email });

  } catch (e) {
    console.error('[Tiger8] loadDB failed:', e);
    DB = { ...DB_DEFAULTS };
    // Show user-facing error after splash hides
    setTimeout(() => {
      showToast('שגיאה בטעינת הנתונים – בדוק חיבור לאינטרנט', 'error');
    }, 500);
  }

  migrateDB();
  const prsReconciled = reconcilePrsFromWorkoutHistory();
  LOADED = JSON.parse(JSON.stringify(DB));

  if (!LOADED.exercises?.length && DB.exercises?.length) {
    _dirty.add('exercises');
    saveDB();
  }
  if (prsReconciled) {
    _dirty.add('prs');
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
let _flushPromise = null;
let _retryCount = 0;
const MAX_SYNC_RETRIES = 3;
let _syncHideTimer = null;

function _showSyncStatus(state) {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  el.className = 'sync-indicator ' + state;
  el.textContent = state === 'syncing' ? '⟳ שומר...' : state === 'saved' ? '✓ נשמר' : '✕ שגיאה';
  clearTimeout(_syncHideTimer);
  if (state !== 'syncing') {
    _syncHideTimer = setTimeout(() => { el.className = 'sync-indicator'; }, 2000);
  }
}

function saveDB() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSave, 250);
}

async function flushSave() {
  if (_saving) {
    if (_flushPromise) await _flushPromise;
    if (!_dirty.size) return;
  }
  if (!_dirty.size) return;
  _saving = true;
  const keys = [..._dirty];
  _dirty.clear();
  _showSyncStatus('syncing');
  _flushPromise = (async () => {
    try {
      const results = await Promise.allSettled(keys.map(key => syncSection(key)));
      let anyFailed = false;
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error('[Tiger8] sync failed:', keys[i], r.reason?.message || r.reason);
          // Re-add failed keys so they'll be retried
          _dirty.add(keys[i]);
          anyFailed = true;
        }
      });
      // Only update LOADED for sections that succeeded
      if (!anyFailed) {
        LOADED = JSON.parse(JSON.stringify(DB));
        _retryCount = 0;
        _showSyncStatus('saved');
      } else {
        // Update LOADED only for the sections that succeeded
        const succeeded = keys.filter((_, i) => results[i].status === 'fulfilled');
        if (succeeded.length > 0) {
          for (const key of succeeded) {
            LOADED[key] = JSON.parse(JSON.stringify(DB[key]));
          }
        }
        _retryCount++;
        if (_retryCount <= MAX_SYNC_RETRIES) {
          _showSyncStatus('syncing');
          // Schedule retry with backoff
          setTimeout(flushSave, 1000 * _retryCount);
        } else {
          _retryCount = 0;
          _showSyncStatus('error');
          showToast('שגיאה בשמירה – נסה שוב מאוחר יותר', 'error');
        }
      }
    } finally {
      _saving = false;
      _flushPromise = null;
      if (_dirty.size && _retryCount === 0) flushSave();
    }
  })();
  return _flushPromise;
}

// Flush on tab hide (mobile background)
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { clearTimeout(_saveTimer); flushSave(); }
});
// On page unload — use beacon approach (fire and forget, keepalive)
window.addEventListener('beforeunload', () => {
  clearTimeout(_saveTimer);
  if (_dirty.size) {
    const keys = [..._dirty];
    _dirty.clear();
    for (const key of keys) {
      try { syncSectionBeacon(key); } catch {}
    }
  }
});

// ─── Section sync (throws on failure) ─────────────────────────────────────────

async function syncSection(key) {
  if      (key === 'user')        await syncProfile();
  else if (key === 'weekPlan')    await syncWeekPlan();
  else if (key === 'prs')         await syncPrs();
  else if (key === 'exercises')   await syncExercises();
  else if (key === 'workouts')    await syncWorkouts();
  else if (key === 'plans')       await syncPlans();
  else if (key === 'weightLog')   await syncWeightLog();
  else if (key === 'supplements') await syncSupplements();
}

// Beacon version for beforeunload — no error handling, just best-effort
function syncSectionBeacon(key) {
  if (key === 'plans') {
    for (const p of DB.plans) {
      apiFetchBeacon('/api/plans', {
        method: 'POST',
        body: JSON.stringify({ id: p.id, name: p.name, description: p.desc, exercises: p.exercises }),
      });
    }
  } else if (key === 'workouts') {
    const loadedIds = new Set((LOADED?.workouts || []).map(w => String(w.id)));
    for (const w of DB.workouts) {
      if (!loadedIds.has(String(w.id))) {
        apiFetchBeacon('/api/workouts', {
          method: 'POST',
          body: JSON.stringify({ id: w.id, name: w.name, muscles: w.muscles, date: w.date, duration: w.duration, exercises: w.exercises }),
        });
      }
    }
  } else if (key === 'user') {
    apiFetchBeacon('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: DB.user.name, age: DB.user.age, height: DB.user.height, goal: DB.user.goal }),
    });
  } else if (key === 'weekPlan') {
    apiFetchBeacon('/api/week-plan', { method: 'PUT', body: JSON.stringify(DB.weekPlan) });
  } else if (key === 'prs') {
    apiFetchBeacon('/api/prs', { method: 'PUT', body: JSON.stringify(DB.prs) });
  }
}

async function syncProfile() {
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

  // Upsert all current plans
  for (const p of DB.plans) {
    await apiFetch('/api/plans', {
      method: 'POST',
      body: JSON.stringify({ id: p.id, name: p.name, description: p.desc, exercises: p.exercises }),
    });
  }
  // Delete removed plans
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
      if (res) { const data = await res.json(); entry.id = data.id; }
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
      return flushSave();
    } else {
      saveDB();
    }
  },
};

async function logout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  window.location.href = '/login.html';
}
