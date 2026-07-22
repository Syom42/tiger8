// ============ REST TIMER ============

let restTimerInterval = null;
let restTimeLeft = 0;
let restTimeTotal = 0;
let restTimerEndsAt = 0;

const REST_TIMER_NOTIFICATION_ID = 8001;
const REST_TIMER_NOTIFICATION_TAG = 'rest-timer';

function getLocalNotifications() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.() || !capacitor.isPluginAvailable?.('LocalNotifications')) {
    return null;
  }
  return capacitor.registerPlugin('LocalNotifications');
}

async function scheduleRestTimerNotification() {
  const notifications = getLocalNotifications();
  if (!notifications || !restTimerEndsAt) return;

  try {
    let permissions = await notifications.checkPermissions();
    if (permissions.display === 'prompt') {
      permissions = await notifications.requestPermissions();
    }
    if (permissions.display !== 'granted') return;

    await notifications.cancel({ notifications: [{ id: REST_TIMER_NOTIFICATION_ID }] });
    await notifications.schedule({
      notifications: [{
        id: REST_TIMER_NOTIFICATION_ID,
        title: 'Tiger8',
        body: 'זמן המנוחה הסתיים',
        schedule: { at: new Date(restTimerEndsAt), allowWhileIdle: true },
        sound: 'default',
        extra: { tag: REST_TIMER_NOTIFICATION_TAG }
      }]
    });
  } catch (error) {
    console.warn('[Tiger8] Could not schedule rest timer notification:', error);
  }
}

async function cancelRestTimerNotification() {
  const notifications = getLocalNotifications();
  if (!notifications) return;

  try {
    await notifications.cancel({ notifications: [{ id: REST_TIMER_NOTIFICATION_ID }] });
  } catch (error) {
    console.warn('[Tiger8] Could not cancel rest timer notification:', error);
  }
}

function notifyRestTimerFinished() {
  if (typeof showToast === 'function') {
    showToast('זמן המנוחה הסתיים');
  }
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  if (getLocalNotifications() || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  new Notification('Tiger8', {
    body: 'זמן המנוחה הסתיים',
    icon: '/tiger8-icon.png',
    tag: REST_TIMER_NOTIFICATION_TAG
  });
}

function finishRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restTimeLeft = 0;
  restTimerEndsAt = 0;
  document.getElementById('restTimer').style.display='none';
  cancelRestTimerNotification();
  notifyRestTimerFinished();
}

function tickRestTimer() {
  restTimeLeft = Math.max(0, Math.ceil((restTimerEndsAt - Date.now()) / 1000));
  if (restTimeLeft <= 0) {
    finishRestTimer();
    return;
  }
  updateTimerDisplay();
}

function startRestTimer(seconds=90) {
  stopTimer();
  restTimeLeft = seconds;
  restTimeTotal = seconds;
  restTimerEndsAt = Date.now() + seconds * 1000;
  document.getElementById('restTimer').style.display='flex';
  updateTimerDisplay();
  scheduleRestTimerNotification();
  restTimerInterval = setInterval(tickRestTimer, 250);
}

function updateTimerDisplay() {
  const m = Math.floor(restTimeLeft/60), s = restTimeLeft%60;
  document.getElementById('timerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct = restTimeTotal>0?(restTimeLeft/restTimeTotal*100):0;
  document.getElementById('timerProgress').style.width = pct+'%';
  const col = pct>60?'var(--accent3)':pct>30?'var(--gold)':'var(--accent2)';
  document.getElementById('timerDisplay').style.color = col;
}

function addTimerSeconds(n) {
  restTimerEndsAt = Math.max(Date.now(), restTimerEndsAt + n * 1000);
  restTimeLeft = Math.max(0, Math.ceil((restTimerEndsAt - Date.now()) / 1000));
  restTimeTotal = Math.max(restTimeTotal, restTimeLeft);
  if (restTimeLeft <= 0) {
    finishRestTimer();
    return;
  }
  updateTimerDisplay();
  scheduleRestTimerNotification();
}

function stopTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  restTimerEndsAt = 0;
  document.getElementById('restTimer').style.display='none';
  cancelRestTimerNotification();
}
