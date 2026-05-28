// ============ UI HELPERS ============
// Dialogs, toasts, modals, navigation

function showDialog({ icon='', title='', msg='', buttons=[] }) {
  document.getElementById('custom-dialog-icon').textContent = icon;
  document.getElementById('custom-dialog-title').textContent = title;
  document.getElementById('custom-dialog-msg').textContent = msg;
  const btns = document.getElementById('custom-dialog-btns');
  btns.innerHTML = '';
  buttons.forEach(b => {
    const el = document.createElement('button');
    el.textContent = b.label;
    el.style.cssText = `flex:1;padding:12px;border-radius:12px;border:none;cursor:pointer;font-family:Rubik,sans-serif;font-size:14px;font-weight:700;transition:opacity 0.15s;${b.primary?'background:var(--accent);color:#fff;':'background:var(--bg3);color:var(--text2);'}`;
    el.onclick = () => { closeDialog(); b.action && b.action(); };
    btns.appendChild(el);
  });
  document.getElementById('custom-dialog-overlay').style.display = 'flex';
}

function closeDialog() {
  document.getElementById('custom-dialog-overlay').style.display = 'none';
}

function showToast(msg, type='success') {
  let toast = document.getElementById('app-toast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;transition:opacity 0.3s;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.15);font-family:Rubik,sans-serif';
    document.body.appendChild(toast);
  }
  toast.style.background = type==='success'?'#00D2D3':type==='error'?'#FF6B6B':'#6C5CE7';
  toast.style.color = '#fff';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity='0'; }, 2500);
}

// ============ NAVIGATION ============
const NAV_ORDER = ['home', 'workout', 'user', 'coach'];
let _currentScreen = 'home';

function showScreen(name, btn) {
  // Map sub-screens to their parent + tab
  const subScreenMap = {
    history:     { parent: 'workout', tab: 'history' },
    prs:         { parent: 'workout', tab: 'prs' },
    weight:      { parent: 'user',    tab: 'weight' },
    supplements: { parent: 'user',    tab: 'supps' },
  };

  if (subScreenMap[name]) {
    const { parent, tab } = subScreenMap[name];
    const navBtn = document.querySelector(`.nav-btn[onclick*="'${parent}'"]`);
    showScreen(parent, navBtn);
    if (parent === 'workout') switchWorkoutTab(tab);
    if (parent === 'user')    switchProfileTab(tab);
    return;
  }

  const fromIdx = NAV_ORDER.indexOf(_currentScreen);
  const toIdx   = NAV_ORDER.indexOf(name);
  const direction = toIdx >= fromIdx ? 'slide-in-left' : 'slide-in-right';
  _currentScreen = name;

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'slide-in-left', 'slide-in-right');
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById('screen-'+name);
  if (screen) {
    screen.classList.add('active', direction);
    // Remove animation class after it finishes so re-clicking works
    screen.addEventListener('animationend', () => {
      screen.classList.remove('slide-in-left', 'slide-in-right');
    }, { once: true });
  }
  if (btn) btn.classList.add('active');

  if (name === 'home')    renderHome();
  if (name === 'workout') renderWorkoutScreen();
  if (name === 'coach')   renderCoachScreen();
  if (name === 'user')    renderUserScreen();
}

function switchWorkoutTab(tab, clickedEl) {
  // Toggle tab panels
  ['plans','history','prs'].forEach(t => {
    const el = document.getElementById('workout-tab-'+t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  // Toggle header actions
  const plansActions  = document.getElementById('workoutScreenActions');
  const prsActions    = document.getElementById('prsScreenActions');
  if (plansActions) plansActions.style.display = tab === 'plans' ? 'flex' : 'none';
  if (prsActions)   prsActions.style.display   = tab === 'prs'   ? ''     : 'none';
  // Update tab pill highlights
  const tabBar = document.getElementById('workoutSubTabs');
  if (tabBar) {
    tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const labels = { plans: 'תוכניות', history: 'היסטוריה', prs: 'שיאים' };
    tabBar.querySelectorAll('.tab').forEach(t => {
      if (t.textContent.trim() === labels[tab]) t.classList.add('active');
    });
  }
  // Re-render content as needed
  if (tab === 'history') renderHistory();
  if (tab === 'prs')     renderPRs();
}

function switchProfileTab(tab, clickedEl) {
  ['profile','weight','supps'].forEach(t => {
    const el = document.getElementById('profile-tab-'+t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  // Update tab pill highlights
  const screen = document.getElementById('screen-user');
  if (screen) {
    screen.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    const labels = { profile: 'פרופיל', weight: 'משקל', supps: 'תוספים' };
    screen.querySelectorAll('.tabs .tab').forEach(t => {
      if (t.textContent.trim() === labels[tab]) t.classList.add('active');
    });
  }
  if (tab === 'weight') renderWeight();
  if (tab === 'supps')  renderSupplements();
}

// ============ MODALS ============
function showModal(id) {
  document.getElementById(id).classList.add('open');
  if(id==='modal-week-plan') renderWeekPlanEditor();
  if(id==='modal-edit-profile') populateEditProfile();
  if(id==='modal-start-choice') renderStartChoicePlans();
  if(id==='modal-routine-template') renderTemplateModal();
  if(id==='modal-1rm') { document.getElementById('ormResult').innerHTML=''; }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function initModalCloseOnBackdrop() {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); });
  });
}
