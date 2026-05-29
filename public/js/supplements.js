// ============ SUPPLEMENTS ============

// DB.supplements schema: [{ id, name, dose, time, enabled, takenDates:[] }]

function renderSupplements() {
  renderSupplementReminders();
  renderSupplementList();
  renderNotifStatus();
}

function renderNotifStatus() {
  const el = document.getElementById('notifStatus');
  if (!el) return;
  if (!('Notification' in window)) {
    el.style.display = 'block';
    el.style.background = 'var(--accent2-glow)';
    el.style.color = 'var(--accent2)';
    el.innerHTML = '⚠️ הדפדפן לא תומך בהתראות';
    return;
  }

  const perm = Notification.permission;
  if (perm === 'denied') {
    el.style.display = 'block';
    el.style.background = 'var(--accent2-glow)';
    el.style.color = 'var(--accent2)';
    el.innerHTML = '🚫 התראות חסומות — אפשר בהרשאות הדפדפן';
  } else if (perm === 'default') {
    el.style.display = 'block';
    el.style.background = 'rgba(108,92,231,0.15)';
    el.style.color = 'var(--accent)';
    el.innerHTML = '🔔 <a href="#" onclick="requestNotificationPermission();return false" style="color:var(--accent);text-decoration:underline">הפעל התראות</a> כדי לקבל תזכורות לתוספים';
  } else {
    el.style.display = 'none';
  }
}

// â”€â”€ Home screen reminder cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Supplement management screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <button onclick="openEditSupplement('${s.id}')"
        style="background:none;border:none;color:var(--text);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:16px;min-width:44px;min-height:44px;transition:all 0.15s">✎</button>
      <button onclick="deleteSupplementPrompt('${s.id}')"
        style="background:var(--accent2-glow);border:none;color:var(--accent2);border-radius:10px;padding:8px 12px;cursor:pointer;font-size:16px;min-width:44px;min-height:44px;transition:all 0.15s">🗑️</button>
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

// â”€â”€ Add / Edit modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openAddSupplement() {
  window._editingSupplementId = null;
  document.getElementById('suppName').value = '';
  document.getElementById('suppDose').value = '';
  document.getElementById('suppTime').value = '08:00';
  const title = document.querySelector('#modal-supplement .modal-title');
  if (title) title.textContent = '💊 הוסף תוסף';
  const btn = document.querySelector('#modal-supplement .btn.btn-primary');
  if (btn) btn.textContent = '✅ הוסף תוסף';
  showModal('modal-supplement');
}

function saveSupplement() {
  const name = document.getElementById('suppName').value.trim();
  const dose = document.getElementById('suppDose').value.trim();
  const time = document.getElementById('suppTime').value || '08:00';
  if (!name) { showToast('הזן שם לתוסף', 'error'); return; }

  if (window._editingSupplementId) {
    const id = window._editingSupplementId;
    db.update(d => {
      const s = d.supplements.find(x => x.id === id);
      if (!s) return;
      s.name = name; s.dose = dose; s.time = time;
    });
    window._editingSupplementId = null;
    showToast('שינויים נשמרו');
  } else {
    db.update(d => {
      d.supplements.push({ id: 'supp_' + Date.now(), name, dose, time, enabled: true, takenDates: [] });
    });
    showToast('✅ ' + name + ' נוסף');
  }

  closeModal('modal-supplement');
  renderSupplements();
  requestNotificationPermission();
}

function openEditSupplement(id) {
  const s = (DB.supplements || []).find(x => x.id === id);
  if (!s) return;
  window._editingSupplementId = id;
  document.getElementById('suppName').value = s.name;
  document.getElementById('suppDose').value = s.dose || '';
  document.getElementById('suppTime').value = s.time || '08:00';
  const title = document.querySelector('#modal-supplement .modal-title');
  if (title) title.textContent = '✏️ ערוך תוסף';
  const btn = document.querySelector('#modal-supplement .btn.btn-primary');
  if (btn) btn.textContent = '💾 שמור שינויים';
  showModal('modal-supplement');
}

// â”€â”€ Browser Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('הדפדפן לא תומך בהתראות', 'error');
    return;
  }
  if (Notification.permission === 'granted') {
    registerSupplementSW();
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        registerSupplementSW();
        showToast('🔔 התראות הופעלו!');
      } else {
        showToast('התראות נחסמו — אפשר בהגדרות הדפדפן', 'error');
      }
    });
  }
  if (Notification.permission === 'denied') {
    showToast('התראות חסומות — שנה הרשאות בדפדפן', 'error');
  }
}

// â”€â”€ Service Worker Registration & Schedule Sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _swRegistration = null;

async function registerSupplementSW() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Tiger8] No serviceWorker support');
    return;
  }
  try {
    _swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Tiger8] SW registered');

    // Wait for the SW to be active (fixes race condition)
    const reg = await navigator.serviceWorker.ready;
    console.log('[Tiger8] SW is active/ready');

    // Listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SUPP_TAKEN') {
        markSupplementTakenFromSW(event.data.suppId, event.data.todayKey);
      }
      if (event.data?.type === 'SUPP_DUE') {
        // In-app notification when the app is open
        showToast(`ðŸ’Š ×–×ž×Ÿ ×œ×§×—×ª ${event.data.name}!`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    });

    // Register periodic background sync if available
    if ('periodicSync' in reg) {
      try {
        await reg.periodicSync.register('supp-check', { minInterval: 60 * 1000 });
        console.log('[Tiger8] Periodic sync registered');
      } catch (e) { console.log('[Tiger8] Periodic sync not available:', e.message); }
    }

    // Sync schedule to SW
    syncSuppScheduleToSW();
  } catch (e) {
    console.warn('[Tiger8] SW registration failed:', e);
  }
}

function syncSuppScheduleToSW() {
  // Use the ready promise to get the active SW â€” avoids the controller being null
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    const sw = reg.active;
    if (!sw) { console.warn('[Tiger8] SW not active yet'); return; }

    const todayKey = new Date().toISOString().slice(0, 10);
    const supplements = (DB.supplements || []).map(s => ({
      id: s.id,
      name: s.name,
      dose: s.dose,
      time: s.time,
      enabled: s.enabled,
      takenToday: (s.takenDates || []).includes(todayKey),
    }));
    sw.postMessage({ type: 'UPDATE_SUPP_SCHEDULE', supplements });
    console.log('[Tiger8] Schedule synced to SW:', supplements.length, 'supplements');
  }).catch(e => console.warn('[Tiger8] syncSuppScheduleToSW failed:', e));
}

function testNotification() {
  if (!('Notification' in window)) {
    showToast('×”×“×¤×“×¤×Ÿ ×œ× ×ª×•×ž×š ×‘×”×ª×¨××•×ª', 'error');
    return;
  }
  if (Notification.permission !== 'granted') {
    requestNotificationPermission();
    return;
  }
  // Try via SW first
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) {
        reg.active.postMessage({ type: 'TEST_NOTIFICATION' });
        showToast('ðŸ”” ×”×ª×¨××ª ×‘×“×™×§×” × ×©×œ×—×”!');
      } else {
        // Fallback: use Notification API directly
        new Notification('ðŸ’Š Tiger8 â€” ×‘×“×™×§×ª ×”×ª×¨××•×ª', {
          body: '×”×”×ª×¨××•×ª ×¢×•×‘×“×•×ª! ðŸŽ‰',
          icon: '/tiger8-icon.png',
          tag: 'supp-test',
        });
        showToast('ðŸ”” ×”×ª×¨××ª ×‘×“×™×§×” × ×©×œ×—×”!');
      }
    });
  } else {
    new Notification('ðŸ’Š Tiger8 â€” ×‘×“×™×§×ª ×”×ª×¨××•×ª', {
      body: '×”×”×ª×¨××•×ª ×¢×•×‘×“×•×ª! ðŸŽ‰',
      tag: 'supp-test',
    });
    showToast('ðŸ”” ×”×ª×¨××ª ×‘×“×™×§×” × ×©×œ×—×”!');
  }
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
  // Also set up fallback setTimeout approach
  _scheduleSupplementTimeouts();
}

let _suppTimeouts = [];
function _scheduleSupplementTimeouts() {
  // Clear previous
  _suppTimeouts.forEach(t => clearTimeout(t));
  _suppTimeouts = [];

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
      const t = setTimeout(() => {
        // Show in-app toast
        showToast(`ðŸ’Š ×–×ž×Ÿ ×œ×§×—×ª ${s.name}!`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        renderSupplementReminders();

        // Also show system notification if permission granted and page is hidden
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification('ðŸ’Š Tiger8 â€” ×–×ž×Ÿ ×œ×§×—×ª ×ª×•×¡×£', {
            body: `${s.name}${s.dose ? ' Â· ' + s.dose : ''}`,
            icon: '/tiger8-icon.png',
            tag: 'supp-fallback-' + s.id
          });
        }
      }, msUntil);
      _suppTimeouts.push(t);
    }
  });
}
