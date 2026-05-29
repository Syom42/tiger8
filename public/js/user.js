// ============ USER & PROFILE ============

function renderUserScreen() {
  if (!DB.user) DB.user = { email: '', name: '', age: null, height: null, goal: 'strength', joined: new Date().toISOString() };
  const displayName = DB.user.name || DB.user.email?.split('@')[0] || 'ספורטאי';
  document.getElementById('userAvatarLetter').textContent = displayName[0].toUpperCase();
  document.getElementById('userNameDisplay').textContent  = displayName;
  const j = DB.user.joined ? new Date(DB.user.joined) : new Date();
  document.getElementById('userJoinedDisplay').textContent = 'חבר מאז ' + j.toLocaleDateString('he-IL');
  document.getElementById('profileWorkouts').textContent  = DB.workouts.length;
  document.getElementById('profileStreak').textContent    = calcStreak();
}

async function saveProfile() {
  try {
    await db.update(d => {
      if (!d.user) d.user = { name: '', age: null, height: null, goal: 'strength', joined: new Date().toISOString() };
      d.user.name   = document.getElementById('editName').value   || d.user.name;
      d.user.age    = document.getElementById('editAge').value || null;
      d.user.height = document.getElementById('editHeight').value || null;
      d.user.goal   = document.getElementById('editGoal').value || 'strength';
    }, { immediate: true });
    showToast('הפרופיל עודכן ✅');
  } catch (e) {
    console.error('saveProfile failed', e);
    showToast('שגיאה בשמירה, נסה שוב', 'error');
    return;
  }
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
