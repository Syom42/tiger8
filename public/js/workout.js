// ============ ACTIVE WORKOUT ============

let activeWorkout = null;
let workoutTimer = null;
let workoutStart = null;
let newWorkoutExercises = [];
let selectedMuscles = [];

function toggleMuscle(el, muscle) {
  el.classList.toggle('active');
  if(el.classList.contains('active')) selectedMuscles.push(muscle);
  else selectedMuscles = selectedMuscles.filter(m=>m!==muscle);
}

function addExerciseToNewByName(name) {
  if (!name) return;
  newWorkoutExercises.push({ name, restSeconds: 90, sets:[{reps:'',weight:'',done:false},{reps:'',weight:'',done:false},{reps:'',weight:'',done:false}] });
  renderNewExList();
}

function addExerciseToNew() {
  const inp = document.getElementById('newExInput');
  const name = inp.value.trim();
  if(!name) return;
  addExerciseToNewByName(name);
  inp.value = '';
}

function renderNewExList() {
  const el = document.getElementById('newExerciseList');
  el.innerHTML = newWorkoutExercises.map((ex,i) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-weight:600;font-size:14px">${ex.name}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:var(--text2)">${ex.sets.length} sets</span>
        <button class="btn btn-sm" style="background:var(--bg3);color:var(--accent2);padding:3px 8px;border:none;border-radius:6px;cursor:pointer" onclick="removeNewEx(${i})">✕</button>
      </span>
    </div>`
  ).join('');
}

function removeNewEx(i) {
  newWorkoutExercises.splice(i,1); renderNewExList();
}

function startNewWorkout() {
  const name = document.getElementById('newWorkoutName').value.trim();
  if(!name) { showToast('הזן שם לאימון ✏️', 'error'); return; }
  if(!newWorkoutExercises.length) { showToast('הוסף לפחות תרגיל אחד 💪', 'error'); return; }
  
  activeWorkout = {
    name, muscles: [...selectedMuscles],
    exercises: newWorkoutExercises.map(ex => ({
      name: ex.name,
      restSeconds: ex.restSeconds || 90,
      sets: [{reps:'',weight:'',done:false},{reps:'',weight:'',done:false},{reps:'',weight:'',done:false}]
    }))
  };
  workoutStart = Date.now();
  localStorage.setItem('ironlog_workout_start', workoutStart);
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  newWorkoutExercises = []; selectedMuscles = [];
  document.getElementById('newWorkoutName').value = '';
  document.querySelectorAll('.muscle-tag').forEach(t=>t.classList.remove('active'));
  renderNewExList();
  closeModal('modal-new-workout');
  
  document.getElementById('activeBadge').style.display='block';
  showScreen('workout', document.querySelectorAll('.nav-btn')[1]);
  renderWorkoutScreen();
  
  workoutTimer = setInterval(updateWorkoutTimer, 1000);
}

function updateWorkoutTimer() {
  if(!workoutStart) return;
  const elapsed = Math.floor((Date.now()-workoutStart)/1000);
  const m = Math.floor(elapsed/60), s = elapsed%60;
  const el = document.getElementById('activeTimer');
  if(el) el.textContent = `⏱️ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function renderWorkoutScreen() {
  renderPlans();
  if(!activeWorkout) {
    document.getElementById('activeWorkoutSection').style.display='none';
    return;
  }
  document.getElementById('activeWorkoutSection').style.display='block';
  document.getElementById('activeWorkoutName').textContent = activeWorkout.name;
  
  const el = document.getElementById('exerciseList');
  el.innerHTML = activeWorkout.exercises.map((ex,ei) => `
    <div class="exercise-item">
      <div class="ex-header" style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div class="ex-name">${ex.name}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:5px">
            <span style="font-size:12px;color:var(--text3)">⏱ מנוחה:</span>
            <input type="number" value="${ex.restSeconds || 90}" min="15" max="600" step="5"
              style="width:52px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px 5px;color:var(--text);font-family:Rubik,sans-serif;font-size:14px;text-align:center;outline:none"
              onchange="updateExRestTime(${ei},this.value)">
            <span style="font-size:12px;color:var(--text3)">שנ'</span>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-ghost" onclick="addSet(${ei})">סט +</button>
          <button class="btn btn-sm btn-danger" onclick="removeExerciseFromWorkout(${ei})">הסר</button>
        </div>
      </div>
      <table class="sets-table">
        <tr><th>סט</th><th>ק"ג</th><th>חזרות</th><th>✓</th><th></th></tr>
        ${ex.sets.map((set,si) => `
          <tr>
            <td><span class="set-num">${si+1}</span></td>
            <td><input class="set-input" type="number" placeholder="0" value="${set.weight}" onchange="updateSet(${ei},${si},'weight',this.value)"></td>
            <td><input class="set-input" type="number" placeholder="0" value="${set.reps}" onchange="updateSet(${ei},${si},'reps',this.value)"></td>
            <td><button class="set-done ${set.done?'checked':''}" onclick="toggleSetDone(${ei},${si},this)">✓</button></td>
            <td><button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:8px 10px;min-width:40px" onclick="removeSet(${ei},${si})">✕</button></td>
          </tr>`).join('')}
      </table>
    </div>
  `).join('');

  // Add-exercise-during-workout row
  el.innerHTML += `
    <div style="margin-top:10px;padding:10px 0;border-top:1px solid var(--border)">
      <div style="display:flex;gap:8px">
        <input type="text" id="liveExInput" placeholder="הוסף תרגיל לאימון..." style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;color:var(--text);font-family:Rubik,sans-serif;font-size:16px;outline:none">
        <button class="btn btn-ghost btn-sm" onclick="addExerciseDuringWorkout()">הוסף</button>
      </div>
    </div>`;
}

function addSet(ei) {
  activeWorkout.exercises[ei].sets.push({reps:'',weight:'',done:false});
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  renderWorkoutScreen();
}

function removeSet(ei, si) {
  if(!activeWorkout) return;
  if(activeWorkout.exercises[ei].sets.length <= 1) { showToast('לא ניתן להסיר את הסט האחרון', 'error'); return; }
  activeWorkout.exercises[ei].sets.splice(si, 1);
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  renderWorkoutScreen();
}

function removeExerciseFromWorkout(ei) {
  if(!activeWorkout) return;
  activeWorkout.exercises.splice(ei, 1);
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  renderWorkoutScreen();
}

function addExerciseDuringWorkout() {
  const inp = document.getElementById('liveExInput');
  if(!inp) return;
  const name = inp.value.trim();
  if(!name) return;
  activeWorkout.exercises.push({ name, restSeconds: 90, sets:[{reps:'',weight:'',done:false},{reps:'',weight:'',done:false},{reps:'',weight:'',done:false}] });
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  renderWorkoutScreen();
  showToast('תרגיל נוסף לאימון ✅');
}

function updateSet(ei,si,field,val) {
  if(activeWorkout) {
    activeWorkout.exercises[ei].sets[si][field] = val;
    localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  }
}

function updateExRestTime(ei, val) {
  if (!activeWorkout) return;
  activeWorkout.exercises[ei].restSeconds = Math.max(15, parseInt(val) || 90);
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
}

function toggleSetDone(ei,si,btn) {
  if(!activeWorkout) return;
  activeWorkout.exercises[ei].sets[si].done = !activeWorkout.exercises[ei].sets[si].done;
  btn.classList.toggle('checked');
  localStorage.setItem('ironlog_active_workout', JSON.stringify(activeWorkout));
  const restSecs = activeWorkout.exercises[ei].restSeconds || 90;
  startRestTimer(restSecs);
}

function finishWorkout() {
  if(!activeWorkout) return;
  clearInterval(workoutTimer);
  const duration = Math.floor((Date.now()-workoutStart)/1000);
  const workout = {
    id: Date.now(),
    name: activeWorkout.name,
    muscles: activeWorkout.muscles,
    date: new Date().toISOString(),
    duration,
    exercises: activeWorkout.exercises
  };
  DB.workouts.push(workout);
  updatePRs(workout);
  saveDB();
  activeWorkout = null; workoutStart = null;
  localStorage.removeItem('ironlog_workout_start');
  localStorage.removeItem('ironlog_active_workout');
  document.getElementById('activeBadge').style.display='none';
  clearInterval(workoutTimer);
  renderWorkoutScreen();
  renderHome();
  showToast('🎉 האימון הסתיים! כל הכבוד!', 'success');
}

function cancelWorkout() {
  showDialog({
    icon: '🛑',
    title: 'ביטול אימון?',
    msg: 'הנתונים שהוזנו לא יישמרו',
    buttons: [
      { label: 'המשך', primary: true },
      { label: 'בטל אימון', action: () => {
        clearInterval(workoutTimer);
        activeWorkout = null; workoutStart = null;
        localStorage.removeItem('ironlog_workout_start');
        localStorage.removeItem('ironlog_active_workout');
        document.getElementById('activeBadge').style.display='none';
        renderWorkoutScreen();
      }}
    ]
  });
}

function updatePRs(workout) {
  workout.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if(!set.weight || !set.reps) return;
      const w = parseFloat(set.weight), r = parseInt(set.reps);
      if(!DB.prs[ex.name] || w > DB.prs[ex.name].weight || (w===DB.prs[ex.name].weight && r>DB.prs[ex.name].reps)) {
        DB.prs[ex.name] = { weight: w, reps: r, date: workout.date };
      }
    });
  });
}

function renderStartChoicePlans() {
  const section = document.getElementById('startChoicePlans');
  if(!DB.plans.length) {
    section.innerHTML = `<div style="text-align:center;padding:16px 0;color:var(--text3);font-size:13px">
      אין תוכניות שמורות עדיין<br>
      <span style="color:var(--accent);cursor:pointer;font-size:12px" onclick="closeModal('modal-start-choice');showModal('modal-new-plan')">+ צור תוכנית ראשונה</span>
    </div>`;
    return;
  }
  section.innerHTML = `<div class="card-title" style="margin-bottom:10px">📋 מתוכנית שמורה</div><div id="startChoicePlanList"></div>`;
  const list = document.getElementById('startChoicePlanList');
  list.innerHTML = DB.plans.map(p => `
    <div onclick="startFromPlanAndClose(${p.id})" style="display:flex;align-items:center;gap:14px;padding:13px 14px;background:var(--bg3);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer;border:1px solid transparent;transition:all 0.2s" 
      onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='transparent'">
      <div style="width:40px;height:40px;background:rgba(108,99,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏋️</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:15px;margin-bottom:2px">${p.name}</div>
        <div style="font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.exercises.length} תרגילים${p.desc?' • '+p.desc:''}</div>
      </div>
      <div style="color:var(--accent);font-size:20px">›</div>
    </div>
  `).join('');
}

function startFromPlanAndClose(id) {
  closeModal('modal-start-choice');
  startFromPlan(id);
  showScreen('workout', document.querySelectorAll('.nav-btn')[1]);
}

// Restore active workout from localStorage (if app was closed during workout)
function restoreActiveWorkout() {
  const savedStart = localStorage.getItem('ironlog_workout_start');
  const savedWorkout = localStorage.getItem('ironlog_active_workout');
  if(savedStart && savedWorkout) {
    try {
      activeWorkout = JSON.parse(savedWorkout);
      workoutStart = parseInt(savedStart);
      document.getElementById('activeBadge').style.display='block';
      workoutTimer = setInterval(updateWorkoutTimer, 1000);
      setTimeout(()=>{
        const elapsed = Math.floor((Date.now()-workoutStart)/1000);
        const m = Math.floor(elapsed/60);
        showDialog({
          icon: '🏋️',
          title: 'האימון שוחזר!',
          msg: `"${activeWorkout.name}" • ${m} דקות\nהאימון שלך עדיין רץ`,
          buttons: [
            { label: 'בטל אימון', action: () => {
              clearInterval(workoutTimer);
              activeWorkout = null; workoutStart = null;
              localStorage.removeItem('ironlog_workout_start');
              localStorage.removeItem('ironlog_active_workout');
              document.getElementById('activeBadge').style.display='none';
            }},
            { label: 'המשך 💪', primary: true, action: () => {
              showScreen('workout', document.querySelectorAll('.nav-btn')[1]);
              renderWorkoutScreen();
            }}
          ]
        });
      }, 500);
    } catch(e) {
      localStorage.removeItem('ironlog_workout_start');
      localStorage.removeItem('ironlog_active_workout');
    }
  }
}
