// ============ MANUAL PR ENTRY ============
function saveManualPR() {
  const name = document.getElementById('addPrExName').value.trim();
  const weight = parseFloat(document.getElementById('addPrWeight').value);
  const reps = parseInt(document.getElementById('addPrReps').value) || 1;

  if (!name) { showToast('הזן שם תרגיל', 'error'); return; }
  if (!weight || weight <= 0) { showToast('הזן משקל תקין', 'error'); return; }
  if (reps < 1) { showToast('הזן מספר חזרות תקין', 'error'); return; }

  const existing = DB.prs[name];
  // A record is the heaviest actual completed set; repetitions break weight ties.
  if (existing) {
    if (weight < Number(existing.weight) ||
      (weight === Number(existing.weight) && reps <= Number(existing.reps))) {
      showToast(`לא שיא משקל חדש — הקיים ${existing.weight}kg×${existing.reps}`, 'error');
      return;
    }
  }

  db.update(d => {
    d.prs[name] = { weight, reps, date: new Date().toISOString() };
  });

  closeModal('modal-add-pr');
  document.getElementById('addPrExName').value = '';
  document.getElementById('addPrWeight').value = '';
  document.getElementById('addPrReps').value = '1';
  renderPRs();
  showToast(`🏆 שיא חדש! ${name} — ${weight}kg × ${reps}`);
}

// ============ 1RM CALCULATOR ============
// Epley formula: 1RM = weight × (1 + reps/30)
function calc1RM() {
  const weight = parseFloat(document.getElementById('ormWeight').value);
  const reps   = parseInt(document.getElementById('ormReps').value);
  const el     = document.getElementById('ormResult');
  if (!weight || !reps || reps < 1) { el.innerHTML = ''; return; }

  const orm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

  const percs = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  const rows = percs.map(p => {
    const kg = (orm * p / 100).toFixed(1);
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="color:var(--text2)">${p}%</span>
      <span style="font-weight:${p===100?'900':'600'};color:${p===100?'var(--accent)':'var(--text)'}">${kg} ק"ג</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="text-align:center;padding:16px 0 12px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:4px">חד-חזרה מקסימלי מוערך</div>
      <div style="font-size:48px;font-weight:900;color:var(--accent);line-height:1">${orm}</div>
      <div style="font-size:14px;color:var(--text2)">ק"ג</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:6px;letter-spacing:0.5px">טבלת אחוזים</div>
    ${rows}`;
}

// ============ TRACKED EXERCISES ============
// Stored in localStorage so it persists without a DB column.

function getTrackedExercises() {
  try { return JSON.parse(localStorage.getItem('tiger8_tracked_ex') || '[]'); } catch { return []; }
}
function setTrackedExercises(arr) {
  localStorage.setItem('tiger8_tracked_ex', JSON.stringify(arr));
}
function isTracked(name) {
  return getTrackedExercises().includes(name);
}
function toggleTrackExercise(name) {
  let list = getTrackedExercises();
  if (list.includes(name)) {
    list = list.filter(n => n !== name);
    showToast(`הסרת מעקב: ${name}`);
  } else {
    list.push(name);
    showToast(`מעקב הופעל: ${name} 📌`);
  }
  setTrackedExercises(list);
  renderPRs();
}

// Returns all historical weight data points for an exercise (sorted oldest→newest)
function getExerciseHistory(exName) {
  return DB.workouts
    .filter(w => w.exercises.some(e => e.name === exName))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(w => {
      const ex = w.exercises.find(e => e.name === exName);
      const best = ex.sets.reduce((b, s) => { const v = parseFloat(s.weight) || 0; return v > b ? v : b; }, 0);
      const bestSet = ex.sets.reduce((b, s) => (parseFloat(s.weight) || 0) >= (parseFloat(b.weight) || 0) ? s : b, ex.sets[0]);
      return {
        date: w.date,
        dateLabel: new Date(w.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
        best,
        reps: parseInt(bestSet?.reps) || 0,
      };
    });
}

const _trackedChartInstances = {};

function renderTrackedExercises() {
  const sec = document.getElementById('trackedExSection');
  if (!sec) return;

  const tracked = getTrackedExercises().filter(name => DB.prs[name] || DB.workouts.some(w => w.exercises.some(e => e.name === name)));
  if (!tracked.length) {
    sec.innerHTML = `
      <div class="card" style="border:1px dashed var(--border-accent);background:transparent;text-align:center;padding:24px 16px;margin-bottom:16px">
        <div style="font-size:32px;margin-bottom:10px">📌</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">עקוב אחרי תרגיל</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6">לחץ על הכוכב ★ ליד כל שיא כדי לעקוב<br>אחרי ההתקדמות שלך לאורך זמן</div>
      </div>`;
    return;
  }

  // Destroy old chart instances before re-render
  Object.keys(_trackedChartInstances).forEach(k => { try { _trackedChartInstances[k].destroy(); } catch {} delete _trackedChartInstances[k]; });

  sec.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">📌 תרגילים במעקב</div>
    ${tracked.map(name => _buildTrackedCard(name)).join('')}`;

  // Init mini-charts after DOM is ready
  tracked.forEach(name => _initTrackedMiniChart(name));
}

function _buildTrackedCard(name) {
  const pr = DB.prs[name];
  const history = getExerciseHistory(name);
  const last = history[history.length - 1];
  const first = history[0];
  const totalSessions = history.length;

  // Progress: compare first session to latest
  let progressHtml = '';
  if (history.length >= 2 && first.best > 0 && last.best > 0) {
    const diff = (last.best - first.best).toFixed(1);
    const pct = ((last.best - first.best) / first.best * 100).toFixed(0);
    const isUp = parseFloat(diff) >= 0;
    progressHtml = `<span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;background:${isUp ? 'var(--accent3-glow)' : 'var(--accent2-glow)'};color:${isUp ? 'var(--accent3)' : 'var(--accent2)'}">${isUp ? '+' : ''}${diff}kg (${isUp ? '+' : ''}${pct}%)</span>`;
  }

  const canvasId = `tracked-chart-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `
    <div class="card" style="margin-bottom:12px;border-color:var(--border-accent)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px">${name}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${pr ? `<span style="font-size:13px;color:var(--text2)">שיא: <strong style="color:var(--gold)">${pr.weight}kg × ${pr.reps}</strong></span>` : ''}
            ${progressHtml}
          </div>
        </div>
        <button onclick="toggleTrackExercise('${name.replace(/'/g, "\\'")}')"
          style="background:var(--accent-glow);border:1px solid var(--border-accent);color:var(--accent-light);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rubik,sans-serif;flex-shrink:0">
          ✕ הסר
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:10px;padding:10px 8px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:var(--accent-light)">${last ? last.best : '--'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;font-weight:600">משקל אחרון (kg)</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px 8px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:var(--accent3)">${totalSessions}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;font-weight:600">אימונים</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:10px 8px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:var(--gold)">${pr ? pr.weight : '--'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;font-weight:600">שיא (kg)</div>
        </div>
      </div>

      ${history.length >= 2 ? `
        <div style="height:80px;position:relative">
          <canvas id="${canvasId}"></canvas>
        </div>` : `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">עוד אין מספיק נתונים לגרף</div>`}
    </div>`;
}

function _initTrackedMiniChart(name) {
  const history = getExerciseHistory(name);
  if (history.length < 2) return;
  const canvasId = `tracked-chart-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  _trackedChartInstances[name] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(d => d.dateLabel),
      datasets: [{
        data: history.map(d => d.best),
        borderColor: '#6C5CE7',
        backgroundColor: 'rgba(108,92,231,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#A29BFE',
        pointRadius: 3,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `${ctx.parsed.y} kg` }
      }},
      scales: {
        x: { ticks: { color: '#5A6478', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#5A6478', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

// ============ PR LIST ============

function renderPRs() {
  renderTrackedExercises();

  const el = document.getElementById('prList');
  const prs = Object.entries(DB.prs);
  if (!prs.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-title">עוד אין שיאים</div><div class="empty-text">השלם אימונים כדי לרשום שיאים</div></div>';
    document.getElementById('exSelectForChart').innerHTML = '';
    return;
  }

  el.innerHTML = prs.map(([name, pr]) => {
    const tracked = isTracked(name);
    return `
      <div class="pr-item">
        <div style="flex:1;min-width:0">
          <div class="pr-name">${name}</div>
          <div class="pr-date">${new Date(pr.date).toLocaleDateString('he-IL')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:left">
            <div class="pr-value">${pr.weight} ק"ג</div>
            <div style="font-size:11px;color:var(--text2)">× ${pr.reps} חזרות</div>
          </div>
          <button onclick="toggleTrackExercise('${name.replace(/'/g, "\\'")}')"
            title="${tracked ? 'הסר מעקב' : 'עקוב אחרי תרגיל'}"
            style="background:${tracked ? 'var(--accent-glow)' : 'var(--bg3)'};border:1px solid ${tracked ? 'var(--border-accent)' : 'var(--border)'};color:${tracked ? 'var(--accent-light)' : 'var(--text3)'};width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0">
            ${tracked ? '★' : '☆'}
          </button>
        </div>
      </div>`;
  }).join('');

  const selEl = document.getElementById('exSelectForChart');
  selEl.innerHTML = '<select onchange="renderPRChart(this.value)" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-family:Rubik,sans-serif;font-size:13px;outline:none"><option value="">-- בחר תרגיל --</option>' +
    prs.map(([n]) => `<option value="${n}">${n}</option>`).join('') + '</select>';
  if (prs.length) renderPRChart(prs[0][0]);
}

let prChartInstance = null;
function renderPRChart(exName) {
  if (!exName) return;
  const data = getExerciseHistory(exName);
  const ctx = document.getElementById('prChart');
  if (prChartInstance) prChartInstance.destroy();
  if (!data.length) return;
  prChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.dateLabel),
      datasets: [{
        label: 'משקל מקסימלי (ק"ג)',
        data: data.map(d => d.best),
        borderColor: '#6C5CE7',
        backgroundColor: 'rgba(108,92,231,0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#A29BFE',
        pointRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8B95A8', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#8B95A8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}
