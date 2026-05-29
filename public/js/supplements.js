// ============ SUPPLEMENTS ============

// DB.supplements schema: [{ id, name, dose, time, enabled, takenDates:[] }]

function renderSupplements() {
  renderSupplementReminders();
  renderSupplementList();
}

// ── Home screen reminder cards ───────────────────────────────────────────────
function renderSupplementReminders() {
  const el = document.getElementById('supplementReminders');
  if (!el) return;

  const todayKey = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const due = (DB.supplements || []).filter(s => {
    if (!s.enabled) return false;
    const [h, m] = (s.time || '08:00').split(':').map(Number);
    const dueMins = h * 60 + m;
    // Show reminder from 1 hour before due time until end of day
    return nowMins >= dueMins - 60;
  });

  if (!due.length) {
    // Show CTA if user has no supplements at all
    if (!DB.supplements || !DB.supplements.length) {
      el.style.display = 'block';
      el.innerHTML = `
        <div class="card" style="border:1px dashed var(--border);text-align:center;padding:16px">
          <div style="font-size:13px;color:var(--text3)">💊 הוסף תוספי תזונה למעקב יומי</div>
          <button class="btn btn-ghost btn-sm" onclick="showScreen('user');switchProfileTab('supps')" style="margin-top:8px">הגדר תוספים</button>
        </div>`;
    } else {
      el.innerHTML = ''; el.style.display = 'none';
    }
    return;
  }
  el.style.display = 'block';

  el.innerHTML = `
    <div class="card">
      <div class="card-title">💊 תוספי היום</div>
      ${due.map(s => {
        const taken = (s.takenDates || []).includes(todayKey);
        return `
          <div class="supp-reminder-row ${taken ? 'taken' : ''}">
            <div class="supp-reminder-info">
              <div class="supp-reminder-name ${taken ? 'done' : ''}">${sanitize(s.name)}</div>
              <div class="supp-reminder-meta">${sanitize(s.dose || '')} · ${sanitize(s.time || '')}</div>
            </div>
            <button class="supp-check-btn ${taken ? 'checked' : ''}" onclick="toggleSupplementTaken('${sanitize(s.id)}')">
              <svg class="supp-check-svg" viewBox="0 0 36 36">
                <circle class="supp-check-ring" cx="18" cy="18" r="16"/>
                <polyline class="supp-check-mark" points="11,18 16,23 25,13"/>
              </svg>
            </button>
          </div>`;
      }).join('')}
    </div>`;
}

function toggleSupplementTaken(id) {
  const todayKey = new Date().toISOString().slice(0, 10);
  let wasTaken = false;
  db.update(d => {
    const s = d.supplements.find(x => x.id === id);
    if (!s) return;
    if (!s.takenDates) s.takenDates = [];
    const idx = s.takenDates.indexOf(todayKey);
    if (idx === -1) {
      s.takenDates.push(todayKey);
      s.takenDates = s.takenDates.slice(-30);
      wasTaken = true;
    } else {
      s.takenDates.splice(idx, 1);
    }
  });
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate(wasTaken ? [30, 20, 30] : [15]);
  renderSupplementReminders();
  syncSuppScheduleToSW();
}

// ── Supplement management screen ─────────────────────────────────────────────
function renderSupplementList() {
  const el = document.getElementById('supplementList');
  if (!el) return;

  if (!DB.supplements?.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">אין תוספים עדיין.<br>הקש + כדי להוסיף.</div>`;
    return;
  }

  el.innerHTML = DB.supplements.map(s => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg2);border-radius:var(--radius);margin-bottom:8px;border:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px">${sanitize(s.name)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${s.dose ? sanitize(s.dose) + ' · ' : ''}${sanitize(s.time) || 'לא נקבע זמן'}</div>
      </div>
      <div onclick="toggleSupplementEnabled('${s.id}')"
        style="width:52px;height:30px;border-radius:15px;background:${s.enabled ? 'var(--accent)' : 'var(--bg3)'};
               position:relative;cursor:pointer;transition:background 0.2s;flex-shrink:0">
        <div style="position:absolute;top:3px;${s.enabled ? 'right:3px' : 'left:3px'};width:24px;height:24px;border-radius:50%;background:#fff;transition:all 0.2s"></div>
      </div>
      <button onclick="deleteSupplementPrompt('${s.id}')"
        style="background:var(--accent2-glow);border:none;color:var(--accent2);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:16px;min-width:44px;min-height:44px;transition:all 0.15s">🗑</button>
    </div>`).join('');
}

function toggleSupplementEnabled(id) {
  db.update(d => {
    const s = d.supplements.find(x => x.id === id);
    if (s) s.enabled = !s.enabled;
  });
  renderSupplements();
}

function deleteSupplementPrompt(id) {
  const s = DB.supplements.find(x => x.id === id);
  if (!s) return;
  showDialog({
    icon: '🗑️',
    title: 'מחיקת תוסף?',
    msg: s.name,
    buttons: [
      { label: 'ביטול' },
      { label: 'מחק', primary: true, action: () => {
        db.update(d => { d.supplements = d.supplements.filter(x => x.id !== id); });
        renderSupplements();
      }}
    ]
  });
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function openAddSupplement() {
  document.getElementById('suppName').value = '';
  document.getElementById('suppDose').value = '';
  document.getElementById('suppTime').value = '08:00';
  showModal('modal-supplement');
}

function saveSupplement() {
  const name = document.getElementById('suppName').value.trim();
  const dose = document.getElementById('suppDose').value.trim();
  const time = document.getElementById('suppTime').value || '08:00';
  if (!name) { showToast('הזן שם לתוסף', 'error'); return; }

  db.update(d => {
    d.supplements.push({ id: 'supp_' + Date.now(), name, dose, time, enabled: true, takenDates: [] });
  });

  closeModal('modal-supplement');
  renderSupplements();
  requestNotificationPermission();
  showToast('✅ ' + name + ' נוסף');
}

// ── Browser Notifications ─────────────────────────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        registerSupplementSW();
        showToast('🔔 התראות הופעלו!');
      }
    });
  }
}

// ── Service Worker Registration & Schedule Sync ──────────────────────────────
let _swRegistration = null;

async function registerSupplementSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    _swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Tiger8] SW registered for notifications');
    // Listen for messages from SW (e.g. SUPP_TAKEN action from notification)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SUPP_TAKEN') {
        markSupplementTakenFromSW(event.data.suppId, event.data.todayKey);
      }
    });
    // Try periodic background sync
    if ('periodicSync' in _swRegistration) {
      try {
        await _swRegistration.periodicSync.register('supp-check', { minInterval: 60 * 1000 });
      } catch { /* not all browsers support this */ }
    }
    // Sync schedule immediately
    syncSuppScheduleToSW();
  } catch (e) {
    console.warn('[Tiger8] SW registration failed:', e);
  }
}

function syncSuppScheduleToSW() {
  if (!navigator.serviceWorker?.controller) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  const supplements = (DB.supplements || []).map(s => ({
    id: s.id,
    name: s.name,
    dose: s.dose,
    time: s.time,
    enabled: s.enabled,
    takenToday: (s.takenDates || []).includes(todayKey),
  }));
  navigator.serviceWorker.controller.postMessage({
    type: 'UPDATE_SUPP_SCHEDULE',
    supplements,
  });
}

function markSupplementTakenFromSW(suppId, todayKey) {
  db.update(d => {
    const s = d.supplements.find(x => x.id === suppId);
    if (!s) return;
    if (!s.takenDates) s.takenDates = [];
    if (!s.takenDates.includes(todayKey)) {
      s.takenDates.push(todayKey);
      s.takenDates = s.takenDates.slice(-30);
    }
  });
  renderSupplementReminders();
  syncSuppScheduleToSW();
}

function scheduleSupplementNotifications() {
  // Register SW if permission already granted
  if ('Notification' in window && Notification.permission === 'granted') {
    registerSupplementSW();
  }
  // Also keep the fallback setTimeout approach for when SW isn't ready
  _scheduleSupplementTimeouts();
}

function _scheduleSupplementTimeouts() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const now = new Date();

  (DB.supplements || []).forEach(s => {
    if (!s.enabled) return;
    const taken = (s.takenDates || []).includes(todayKey);
    if (taken) return;

    const [h, m] = (s.time || '08:00').split(':').map(Number);
    const fireAt = new Date();
    fireAt.setHours(h, m, 0, 0);
    const msUntil = fireAt - now;

    if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        if (document.hidden) {
          new Notification('💊 Tiger8 — Supplement Reminder', {
            body: `Time to take ${s.name}${s.dose ? ' · ' + s.dose : ''}`,
            icon: '/icon-192.png',
            tag: 'supp-' + s.id
          });
        }
        renderSupplementReminders();
      }, msUntil);
    }
  });
}
