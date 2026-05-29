// ============ REST TIMER ============

let restTimerInterval = null;
let restTimeLeft = 0;
let restTimeTotal = 0;

function startRestTimer(seconds=90) {
  stopTimer();
  restTimeLeft = seconds; restTimeTotal = seconds;
  document.getElementById('restTimer').style.display='flex';
  updateTimerDisplay();
  restTimerInterval = setInterval(() => {
    restTimeLeft--;
    if(restTimeLeft<=0) { stopTimer(); return; }
    updateTimerDisplay();
  }, 1000);
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
  restTimeLeft = Math.max(0, restTimeLeft+n);
  restTimeTotal = Math.max(restTimeTotal, restTimeLeft);
  updateTimerDisplay();
}

function stopTimer() {
  clearInterval(restTimerInterval);
  document.getElementById('restTimer').style.display='none';
}
