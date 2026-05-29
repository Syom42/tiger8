// Tiger8 Service Worker â€” Supplement Notification Scheduler
const CACHE_NAME = 'tiger8-supps-v2';
const SCHEDULE_CACHE_KEY = '/supp-schedule.json';

// â”€â”€â”€ Install & Activate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  self.clients.claim().then(() => loadScheduleFromCache())
));

// â”€â”€â”€ Persist schedule in Cache API so it survives SW restarts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function saveScheduleToCache(supps) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(supps), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(SCHEDULE_CACHE_KEY, response);
  } catch (e) { console.warn('[SW] cache save failed:', e); }
}

async function loadScheduleFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(SCHEDULE_CACHE_KEY);
    if (response) {
      self.suppSchedule = await response.json();
      scheduleNotifications();
    }
  } catch (e) { console.warn('[SW] cache load failed:', e); }
}

// â”€â”€â”€ Listen for schedule updates from the main app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_SUPP_SCHEDULE') {
    self.suppSchedule = event.data.supplements || [];
    saveScheduleToCache(self.suppSchedule);
    scheduleNotifications();
  }
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('ðŸ’Š Tiger8 â€” ×‘×“×™×§×ª ×”×ª×¨××•×ª', {
      body: '×”×”×ª×¨××•×ª ×¢×•×‘×“×•×ª! ðŸŽ‰',
      icon: '/tiger8-icon.png',
      vibrate: [200, 100, 200],
      tag: 'supp-test',
      requireInteraction: false,
    });
  }
});

// â”€â”€â”€ Notification scheduling via setTimeout (precise timing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _scheduledTimers = [];

function scheduleNotifications() {
  // Clear any previous timers
  _scheduledTimers.forEach(t => clearTimeout(t));
  _scheduledTimers = [];

  const supps = self.suppSchedule || [];
  if (!supps.length) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  supps.forEach(s => {
    if (!s.enabled || s.takenToday) return;

    const [h, m] = (s.time || '08:00').split(':').map(Number);
    const fireAt = new Date();
    fireAt.setHours(h, m, 0, 0);

    // Schedule the main notification
    const msUntil = fireAt.getTime() - now.getTime();
    if (msUntil > -60000 && msUntil < 24 * 60 * 60 * 1000) {
      const delay = Math.max(0, msUntil);
      const t1 = setTimeout(() => fireNotification(s, todayKey, false), delay);
      _scheduledTimers.push(t1);

      // Schedule a 5-min reminder
      const t2 = setTimeout(() => fireNotification(s, todayKey, true), delay + 5 * 60 * 1000);
      _scheduledTimers.push(t2);
    }
  });
}

function fireNotification(s, todayKey, isReminder) {
  const title = isReminder ? 'ðŸ’Š ×ª×–×›×•×¨×ª × ×•×¡×¤×ª' : 'ðŸ’Š Tiger8 â€” ×–×ž×Ÿ ×œ×§×—×ª ×ª×•×¡×£';
  const body = isReminder
    ? `×¢×“×™×™×Ÿ ×œ× ×œ×§×—×ª ${s.name}`
    : `${s.name}${s.dose ? ' Â· ' + s.dose : ''}`;
  const tag = isReminder
    ? `supp-reminder-${s.id}-${todayKey}`
    : `supp-${s.id}-${todayKey}`;

  self.registration.showNotification(title, {
    body,
    icon: '/tiger8-icon.png',
    badge: '/tiger8-icon.png',
    tag,
    vibrate: [200, 100, 200],
    requireInteraction: !isReminder,
    actions: [
      { action: 'taken', title: 'âœ“ ×œ×§×—×ª×™' },
      { action: 'snooze', title: 'â° +10 ×“×§×³' }
    ],
    data: { suppId: s.id, todayKey }
  });

  // Also notify open clients to show in-app alert
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({
      type: 'SUPP_DUE', suppId: s.id, name: s.name
    }));
  });
}

// â”€â”€â”€ Notification click handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { suppId, todayKey } = event.notification.data || {};

  if (event.action === 'taken' && suppId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SUPP_TAKEN', suppId, todayKey });
        });
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'snooze' && suppId) {
    const supp = (self.suppSchedule || []).find(s => s.id === suppId);
    event.waitUntil(
      new Promise(resolve => {
        setTimeout(() => {
          self.registration.showNotification('ðŸ’Š ×ª×–×›×•×¨×ª â€” ' + (supp ? supp.name : ''), {
            body: supp?.dose || '×–×ž×Ÿ ×œ×§×—×ª!',
            icon: '/tiger8-icon.png',
            tag: `supp-snooze-${suppId}-${todayKey}`,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            data: { suppId, todayKey }
          });
          resolve();
        }, 10 * 60 * 1000);
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});

// â”€â”€â”€ Periodic Background Sync (if supported) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'supp-check') {
    event.waitUntil(loadScheduleFromCache().then(() => {
      const supps = self.suppSchedule || [];
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const todayKey = now.toISOString().slice(0, 10);
      supps.forEach(s => {
        if (!s.enabled || s.takenToday) return;
        const [h, m] = (s.time || '08:00').split(':').map(Number);
        if (nowMins >= h * 60 + m && nowMins <= h * 60 + m + 10) {
          fireNotification(s, todayKey, false);
        }
      });
    }));
  }
});

// â”€â”€â”€ On SW start, reload schedule from cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
loadScheduleFromCache();
