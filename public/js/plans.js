// ============ PLANS ============

let planExList_arr = []; // [{ name, restSeconds }]
let editingPlanId = null;

function normalizeExercise(ex) {
  return typeof ex === 'string'
    ? { name: ex, restSeconds: 90 }
    : { name: ex.name, restSeconds: ex.restSeconds || 90 };
}

function addExToPlanByName(name) {
  if (!name) return;
  if (planExList_arr.some(e => e.name === name)) { showToast('תרגיל כבר ברשימה', 'error'); return; }
  planExList_arr.push({ name, restSeconds: 90 });
  renderPlanExList();
}

function addExToPlan() {
  const inp = document.getElementById('planExInput');
  addExToPlanByName(inp.value.trim());
  inp.value = '';
}

function renderPlanExList() {
  const el = document.getElementById('planExList');
  if (!planExList_arr.length) { el.innerHTML = ''; return; }
  el.innerHTML = planExList_arr.map((ex, i) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:14px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</span>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <span style="font-size:13px;color:var(--text3)">⏱</span>
        <input type="number" value="${ex.restSeconds}" min="15" max="600" step="5"
          style="width:54px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:5px 4px;color:var(--text);font-family:'Rubik',sans-serif;font-size:14px;text-align:center;outline:none"
          onchange="planExList_arr[${i}].restSeconds=Math.max(15,parseInt(this.value)||90)">
        <span style="font-size:12px;color:var(--text3)">שנ'</span>
        <button onclick="planExList_arr.splice(${i},1);renderPlanExList()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:18px;padding:4px 8px;min-width:36px">✕</button>
      </div>
    </div>`
  ).join('');
}

function savePlan() {
  const name = document.getElementById('planName').value.trim();
  if(!name) return;
  const desc = document.getElementById('planDesc').value;
  const exercises = [...planExList_arr];
  if (editingPlanId) {
    const eid = editingPlanId;
    db.update(d => {
      const plan = d.plans.find(p => p.id === eid);
      if (plan) { plan.name = name; plan.desc = desc; plan.exercises = exercises; }
    }, { immediate: true });
  } else {
    db.update(d => {
      d.plans.push({ id: Date.now(), name, desc, exercises });
    }, { immediate: true });
  }
  editingPlanId = null;
  planExList_arr = [];
  document.getElementById('planName').value=''; document.getElementById('planDesc').value='';
  document.querySelector('#modal-new-plan .modal-title').textContent = 'תוכנית חדשה';
  renderPlanExList(); renderPlans(); closeModal('modal-new-plan');
}

function editPlan(id) {
  const plan = DB.plans.find(p => p.id === id);
  if (!plan) return;
  editingPlanId = id;
  planExList_arr = plan.exercises.map(normalizeExercise);
  document.getElementById('planName').value = plan.name;
  document.getElementById('planDesc').value = plan.desc || '';
  document.querySelector('#modal-new-plan .modal-title').textContent = 'עריכת תוכנית';
  renderPlanExList();
  showModal('modal-new-plan');
}

function renderPlans() {
  const el = document.getElementById('plansList');
  if(!DB.plans.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">אין תוכניות עדיין</div><div class="empty-text">צור את תוכנית האימון הראשונה שלך</div></div>';
    return;
  }
  el.innerHTML = DB.plans.map(p => {
    const names = p.exercises.slice(0,3).map(e => normalizeExercise(e).name).join(', ');
    return `
    <div class="card" style="cursor:pointer;border-left:3px solid var(--accent)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div style="font-size:17px;font-weight:800;margin-bottom:4px;letter-spacing:-0.02em">${p.name}</div>
          ${p.desc?`<div style="font-size:12px;color:var(--text2);margin-bottom:8px">${p.desc}</div>`:''}
          <div style="font-size:12px;color:var(--text3);display:flex;align-items:center;gap:4px"><span style="color:var(--accent-light)">💪</span> ${p.exercises.length} תרגילים: ${names}${p.exercises.length>3?'...':''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-primary btn-sm" onclick="startFromPlan(${p.id})">▶ התחל</button>
          <button class="btn btn-ghost btn-sm" onclick="editPlan(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deletePlan(${p.id})">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function startFromPlan(id) {
  const plan = DB.plans.find(p=>p.id===id);
  if(!plan) return;
  activeWorkout = {
    name: plan.name, muscles: [],
    exercises: plan.exercises.map(ex => {
      const e = normalizeExercise(ex);
      return {
        name: e.name,
        restSeconds: e.restSeconds,
        sets: getLastUsedSets(e.name)
      };
    })
  };
  workoutStart = Date.now();
  localStorage.setItem('ironlog_workout_start', workoutStart);
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  document.getElementById('activeBadge').style.display='block';
  renderWorkoutScreen();
  workoutTimer = setInterval(updateWorkoutTimer, 1000);
}

function deletePlan(id) {
  showDialog({
    icon: '🗑',
    title: 'מחיקת תוכנית?',
    msg: 'לא ניתן לבטל פעולה זו',
    buttons: [
      { label: 'ביטול' },
      { label: 'מחק', primary: true, action: () => {
        db.update(d => { d.plans = d.plans.filter(p => p.id !== id); }, { immediate: true });
        renderPlans();
        showToast('התוכנית נמחקה');
      }}
    ]
  });
}
