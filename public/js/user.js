// ============ USER & PROFILE ============

function renderUserScreen() {
  if (!DB.user) return; // safety (should never happen after auto-init)
  document.getElementById('userAvatarLetter').textContent = (DB.user.name || 'A')[0].toUpperCase();
  document.getElementById('userNameDisplay').textContent  = DB.user.name;
  const j = DB.user.joined ? new Date(DB.user.joined) : new Date();
  document.getElementById('userJoinedDisplay').textContent = 'חבר מאז ' + j.toLocaleDateString('he-IL');
  document.getElementById('profileWorkouts').textContent  = DB.workouts.length;
  document.getElementById('profileStreak').textContent    = calcStreak();
}

function saveProfile() {
  if (!DB.user) return;
  db.update(d => {
    d.user.name   = document.getElementById('editName').value   || d.user.name;
    d.user.age    = document.getElementById('editAge').value;
    d.user.height = document.getElementById('editHeight').value;
    d.user.goal   = document.getElementById('editGoal').value;
  }, { immediate: true });
  renderUserScreen();
  renderHome();
  closeModal('modal-edit-profile');
}

function populateEditProfile() {
  if(!DB.user) return;
  document.getElementById('editName').value = DB.user.name || '';
  document.getElementById('editAge').value = DB.user.age || '';
  document.getElementById('editHeight').value = DB.user.height || '';
  document.getElementById('editGoal').value = DB.user.goal || 'strength';
}

// ============ WEEK PLAN ============
const DAYS_HE = { sun:'ראשון', mon:'שני', tue:'שלישי', wed:'רביעי', thu:'חמישי', fri:'שישי', sat:'שבת' };

function renderWeekPlanEditor() {
  const el = document.getElementById('weekPlanEditor');
  el.innerHTML = Object.entries(DAYS_HE).map(([key,name])=>`
    <div class="input-group">
      <label>${name}</label>
      <input type="text" id="wp_${key}" placeholder="לדוגמה: פוש, מנוחה, חזה + כתפיים..." value="${DB.weekPlan[key]||''}">
    </div>`).join('');
}

function saveWeekPlan() {
  db.update(d => {
    Object.keys(DAYS_HE).forEach(k => {
      const inp = document.getElementById('wp_' + k);
      if (inp) d.weekPlan[k] = inp.value.trim();
    });
  }, { immediate: true });
  closeModal('modal-week-plan');
  renderTodayPlan();
}
