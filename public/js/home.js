// ============ HOME SCREEN ============

function renderHome() {
  const name = DB.user?.name || DB.user?.email?.split('@')[0] || 'ספורטאי';
  const h = new Date().getHours();
  const greet = h<12 ? 'בוקר טוב' : h<17 ? 'צהריים טובים' : 'ערב טוב';
  document.getElementById('greetingText').textContent = greet + ', ' + name + '! 💪';
  document.getElementById('streakDisplay').textContent = '🔥 ' + calcStreak();
  document.getElementById('statWorkouts').textContent = DB.workouts.length;
  const lastW = DB.weightLog.length ? DB.weightLog[DB.weightLog.length-1].weight + '' : '--';
  document.getElementById('statWeight').textContent = lastW;
  document.getElementById('statPRs').textContent = Object.keys(DB.prs).length;
  document.getElementById('statThisWeek').textContent = workoutsThisWeek();
  renderWeekCalendar();
  renderTodayPlan();
  renderLastWorkoutPreview();
}

function calcStreak() {
  if(!DB.workouts.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  let streak = 0; let d = new Date(today);
  const days = DB.workouts.map(w => { const dd = new Date(w.date); dd.setHours(0,0,0,0); return dd.getTime(); });
  while(true) {
    if(days.includes(d.getTime())) { streak++; d.setDate(d.getDate()-1); }
    else if(streak===0 && d.getTime()===today.getTime()) { d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function workoutsThisWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  return DB.workouts.filter(w => new Date(w.date) >= sunday).length;
}

function renderWeekCalendar() {
  const cal = document.getElementById('weekCalendar');
  const dayKeys   = ['sun','mon','tue','wed','thu','fri','sat'];
  const dayLabels = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  const today = new Date(); today.setHours(0,0,0,0);
  cal.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    const key = dayKeys[i];
    const planId = DB.weekPlan[key];
    const matchingPlan = DB.plans.find(p => p.id === Number(planId));
    const planName = matchingPlan?.name || '';

    // Workouts done on this day
    const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const dayWorkouts = DB.workouts.filter(w => {
      const wd = new Date(w.date);
      const wStr = wd.getFullYear() + '-' + String(wd.getMonth()+1).padStart(2,'0') + '-' + String(wd.getDate()).padStart(2,'0');
      return wStr === dStr;
    });
    const hasWorkout = dayWorkouts.length > 0;
    const isToday    = d.getTime() === today.getTime();

    const el = document.createElement('div');
    const stateClass = hasWorkout ? 'has-workout' : matchingPlan ? 'has-plan' : 'empty';
    el.className = 'day-cell ' + stateClass + (isToday ? ' today' : '');
    el.style.cssText = `position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 2px;min-height:56px;cursor:pointer;transition:transform 0.15s;width:100%;`;

    el.onclick = () => showDayFullDetails(d, dayWorkouts, matchingPlan);

    // Day label
    const lbl = document.createElement('div');
    lbl.textContent = dayLabels[i];
    lbl.style.cssText = 'font-size:12px;font-weight:700;color:var(--text3);flex-shrink:0';
    el.appendChild(lbl);

    if (hasWorkout) {
      // Completed — show check + compact name
      const check = document.createElement('div');
      check.textContent = '✅';
      check.style.fontSize = '14px';
      el.appendChild(check);
      const nameTag = document.createElement('div');
      const short = dayWorkouts[0].name.length > 4 ? dayWorkouts[0].name.substring(0,4) + '…' : dayWorkouts[0].name;
      nameTag.textContent = short;
      nameTag.style.cssText = 'font-size:11px;font-weight:700;padding:2px 3px;border-radius:3px;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(16,185,129,0.2);color:var(--accent3);';
      el.appendChild(nameTag);
      if (dayWorkouts.length > 1) {
        const badge = document.createElement('div');
        badge.textContent = '+' + (dayWorkouts.length - 1);
        badge.style.cssText = 'font-size:11px;font-weight:700;color:var(--accent3);';
        el.appendChild(badge);
      }
    } else if (matchingPlan) {
      // Has a plan — show plan name only (compact)
      const planTag = document.createElement('div');
      const short = planName.length > 4 ? planName.substring(0,4) + '…' : planName;
      planTag.textContent = short;
      planTag.style.cssText = 'font-size:11px;font-weight:700;padding:2px 3px;border-radius:3px;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(59,130,246,0.18);color:var(--accent);line-height:1.3';
      el.appendChild(planTag);
    } else if (isToday) {
      const dot = document.createElement('div');
      dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:var(--accent);margin-top:2px;opacity:0.6;';
      el.appendChild(dot);
    }

    cal.appendChild(el);
  }
}

function showDayPlanInfo(plan, date) {
  const dateStr = date.toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' });
  showDialog({
    icon: '📋',
    title: plan.name,
    msg: dateStr + '\n' + plan.exercises.map(e => typeof e === 'string' ? e : e.name).join(' • '),
    buttons: [
      { label: 'סגור' },
      { label: '▶ התחל אימון', primary: true, action: () => startFromPlan(plan.id) }
    ]
  });
}

function showDayFullDetails(dateObj, workouts, plan) {
  const dateStr = dateObj.toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' });

  // Remove any existing day-detail panel
  const existing = document.getElementById('day-detail-panel');
  if (existing) existing.remove();

  // Build HTML content
  let inner = '';

  if (workouts && workouts.length > 0) {
    workouts.forEach(wo => {
      let durationStr = '—';
      if (wo.endTime && wo.startTime) {
        durationStr = Math.round((wo.endTime - wo.startTime) / 60000) + ' דקות';
      } else if (wo.duration) {
        durationStr = Math.round(wo.duration / 60) + ' דקות';
      }
      const exList = (wo.exercises || []).map(ex =>
        `<li style="padding:7px 0;border-bottom:1px solid var(--border);font-size:14px;">${sanitize(ex.name)} <span style="color:var(--text3);font-size:13px;">– ${(ex.sets||[]).length} סטים</span></li>`
      ).join('');
      inner += `
        <div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="font-weight:700;font-size:16px;">💪 ${sanitize(wo.name)}</div>
            <div style="font-size:13px;color:var(--text3);">${durationStr}</div>
          </div>
          <ul style="list-style:none;padding:0;margin:0;">${exList || '<li style="color:var(--text3);font-size:13px;">אין פירוט</li>'}</ul>
          <button onclick="showWorkoutDetail('${Number(wo.id)}');document.getElementById('day-detail-panel').remove()" style="margin-top:10px;width:100%;padding:8px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-family:Rubik,sans-serif;font-weight:600;font-size:13px;cursor:pointer;">פרטים מלאים ›</button>
        </div>`;
    });
  }

  if (plan) {
    const isCompleted = workouts && workouts.some(w => w.name === plan.name);
    inner += `<div style="margin-top:${workouts && workouts.length ? 4 : 0}px;">
      <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:700;">
        ${isCompleted ? '📋 תוכנית מקורית' : '📅 תוכנית מתוכננת'}
      </div>`;
    const exList = (plan.exercises || []).map(ex =>
      `<li style="padding:7px 0;border-bottom:1px solid var(--border);font-size:14px;">${sanitize(ex.name || ex)} ${ex.sets ? '<span style="color:var(--text3);font-size:13px;">('+ex.sets.length+' סט)</span>' : ''}</li>`
    ).join('');
    inner += `<div style="background:var(--bg3);border-radius:14px;padding:14px;opacity:${isCompleted ? 0.7 : 1};">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px;">${sanitize(plan.name)}</div>
      <ul style="list-style:none;padding:0;margin:0;">${exList}</ul>
    </div>`;
    inner += `</div>`;
  }

  if (!inner) {
    inner = `<div style="text-align:center;padding:24px 0;color:var(--text3);">
      <div style="font-size:40px;margin-bottom:8px;">📭</div>
      <div style="font-size:14px;">אין נתונים ליום זה</div>
    </div>`;
  }

  // Build the panel (bottom sheet style)
  const overlay = document.createElement('div');
  overlay.id = 'day-detail-panel';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);z-index:300;display:flex;align-items:flex-end;justify-content:center;animation:fadeOverlay 0.2s ease;';
  overlay.innerHTML = `
    <div style="background:var(--bg2);border-radius:28px 28px 0 0;width:100%;max-width:430px;padding:24px 20px 32px;max-height:80vh;overflow-y:auto;animation:sheetUp 0.35s cubic-bezier(0.16,1,0.3,1);box-shadow:0 -8px 40px rgba(0,0,0,0.3);">
      <div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-size:17px;font-weight:800;color:var(--text);">${dateStr}</div>
        <button onclick="document.getElementById('day-detail-panel').remove()" style="background:var(--bg3);border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:18px;color:var(--text2);display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
      ${inner}
    </div>`;

  // Close when tapping the dark backdrop
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}

function showDayWorkouts(workouts, date) {
  const dateStr = date.toLocaleDateString('he-IL', { weekday:'long', day:'numeric', month:'long' });

  if (workouts.length === 1) {
    // Go straight to detail
    showWorkoutDetail(workouts[0].id);
    return;
  }

  // Multiple workouts — show a picker dialog
  showDialog({
    icon: '📅',
    title: dateStr,
    msg: workouts.map(w => w.name).join(' • '),
    buttons: [
      { label: 'סגור' },
      ...workouts.map(w => ({
        label: w.name.length > 14 ? w.name.substring(0,14) + '…' : w.name,
        primary: true,
        action: () => showWorkoutDetail(w.id)
      }))
    ]
  });
}

// Start the plan assigned to a day by its stable ID.
function startDayPlan(planId) {
  const plan = DB.plans.find(p => p.id === Number(planId));
  if (plan) {
    startFromPlan(plan.id);
    showScreen('workout', document.querySelector('.nav-btn:nth-child(2)'));
  }
}

function renderTodayPlan() {
  const el = document.getElementById('todayPlan');
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];
  const today = dayNames[new Date().getDay()];
  const planId = DB.weekPlan[today];
  const matchingPlan = DB.plans.find(p => p.id === Number(planId));
  if (!matchingPlan) {
    el.innerHTML = `<div style="font-size:13px;color:var(--text3)">לא הוגדרה תוכנית להיום &mdash; <span style="color:var(--accent);cursor:pointer" onclick="showModal('modal-week-plan')">הגדר לוח שבועי</span></div>`;
  } else {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--accent)">${sanitize(matchingPlan.name)}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${matchingPlan.exercises.length} תרגילים</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="startDayPlan(${Number(matchingPlan.id)})">&#9654; התחל</button>
      </div>`;
  }
}

function renderLastWorkoutPreview() {
  const el = document.getElementById('lastWorkoutPreview');
  if (!DB.workouts.length) { el.innerHTML = '<div style="font-size:13px;color:var(--text3)">אין אימונים עדיין</div>'; return; }
  const w = DB.workouts[0]; // workouts are sorted date desc, first is most recent
  const d = new Date(w.date).toLocaleDateString('he-IL');
  el.innerHTML = `<div style="font-weight:700;font-size:16px">${w.name}</div>
    <div style="font-size:12px;color:var(--text2);margin-top:4px">${d} • ${w.exercises.length} תרגילים</div>`;
}
