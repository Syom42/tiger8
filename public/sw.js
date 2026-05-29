// Tiger8 Service Worker — Supplement Notification Scheduler
const CACHE_NAME = 'tiger8-supps-v1';
const SUPP_STORE_KEY = 'tiger8_supp_schedule';

// ─── Install & Activate ──────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ─── Listen for schedule updates from the main app ───────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_SUPP_SCHEDULE') {
    // Store supplement schedule: [{id, name, dose, time, enabled, takenToday}]
    self.suppSchedule = event.data.supplements || [];
    // Reschedule alarms
    scheduleNotifications();
  }
});

// ─── Periodic check via setInterval inside SW (runs while SW is alive) ───────
let checkInterval = null;

function scheduleNotifications() {
  if (checkInterval) clearInterval(checkInterval);
  // Check every 30 seconds
  checkInterval = setInterval(checkAndNotify, 30000);
  // Also check immediately
  checkAndNotify();
}

function checkAndNotify() {
  const supps = self.suppSchedule || [];
  if (!supps.length) return;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayKey = now.toISOString().slice(0, 10);

  supps.forEach(s => {
    if (!s.enabled || s.takenToday) return;

    const [h, m] = (s.time || '08:00').split(':').map(Number);
    const dueMins = h * 60 + m;

    // Fire notification if we're within 1 minute of the due time
    if (nowMins === dueMins) {
      // Prevent duplicate: use a tag so browser deduplicates
      self.registration.showNotification('💊 Tiger8 — זמן לקחת תוסף', {
        body: `${s.name}${s.dose ? ' · ' + s.dose : ''}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `supp-${s.id}-${todayKey}`,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'taken', title: '✓ לקחתי' },
          { action: 'snooze', title: '⏰ הזכר בעוד 10 דק׳' }
        ],
        data: { suppId: s.id, todayKey }
      });
    }

    // Also fire if we're 5 minutes past due (reminder)
    if (nowMins === dueMins + 5) {
      self.registration.showNotification('💊 תזכורת נוספת', {
        body: `עדיין לא לקחת ${s.name}`,
        icon: '/icon-192.png',
        tag: `supp-reminder-${s.id}-${todayKey}`,
        vibrate: [100, 50, 100],
        data: { suppId: s.id, todayKey }
      });
    }
  });
}

// ─── Notification click handler ──────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { suppId, todayKey } = event.notification.data || {};

  if (event.action === 'taken' && suppId) {
    // Tell the app to mark as taken
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SUPP_TAKEN', suppId, todayKey });
        });
        // Focus existing window or open new
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'snooze' && suppId) {
    // Snooze: show notification again in 10 minutes
    const supp = (self.suppSchedule || []).find(s => s.id === suppId);
    if (supp) {
      setTimeout(() => {
        self.registration.showNotification('💊 תזכורת — ' + supp.name, {
          body: supp.dose || 'זמן לקחת!',
          icon: '/icon-192.png',
          tag: `supp-snooze-${suppId}-${todayKey}`,
          vibrate: [200, 100, 200],
          requireInteraction: true,
          data: { suppId, todayKey }
        });
      }, 10 * 60 * 1000);
    }
  } else {
    // Default: open app
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

// ─── Periodic Background Sync (if supported) ─────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'supp-check') {
    event.waitUntil(checkAndNotify());
  }
});
