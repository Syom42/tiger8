// ============ UTILITIES ============

function confirmClearData() {
  showDialog({
    icon: '⚠️',
    title: 'מחיקת כל הנתונים?',
    msg: 'כל האימונים, השיאים ורשומות המשקל יימחקו לצמיתות',
    buttons: [
      { label: 'ביטול', primary: true },
      { label: 'מחק הכל', action: () => { clearData(); showToast('כל הנתונים נמחקו'); } }
    ]
  });
}

function exportData() {
  const json = JSON.stringify(DB, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'ironlog_backup.json'; a.click();
}

function clearData() {
  DB = { ...DB_DEFAULTS, user: DB.user, exercises: DB.exercises, theme: DB.theme };
  saveDB(); renderHome(); renderUserScreen(); renderWorkoutScreen();
}

/* THEME TOGGLE LOGIC — stored in localStorage (no server sync needed) */
function toggleTheme() {
  const current = localStorage.getItem('tiger8_theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tiger8_theme', next);
  applyTheme();
}

function applyTheme() {
  const currentTheme = localStorage.getItem('tiger8_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  const themeVal = document.getElementById('themeValDisplay');
  if (themeVal) {
    themeVal.innerText = currentTheme === 'dark' ? 'מצב כהה' : 'מצב בהיר';
  }
}

// Ensure theme is applied on load
setTimeout(applyTheme, 0);

/* ONBOARDING LOGIC */
function showOnboarding() {
  showModal('modal-onboarding');
}

function completeOnboarding() {
  const name = document.getElementById('onboardName').value.trim();
  const goal = document.getElementById('onboardGoal').value;
  const level = document.getElementById('onboardLevel').value;

  db.update(d => {
    if (name) d.user.name = name;
    d.user.goal = goal;
  }, { immediate: true });

  localStorage.setItem('tiger8_onboarded', '1');

  // Suggest a template based on level
  const templateMap = { beginner: 'full_body', intermediate: 'upper_lower', advanced: 'ppl' };
  const suggestedTemplate = templateMap[level] || 'full_body';

  closeModal('modal-onboarding');
  renderHome();
  renderUserScreen();

  // Show template suggestion
  setTimeout(() => {
    showDialog({
      icon: '📋',
      title: 'תבנית אימון מומלצת',
      msg: `בהתאם לרמה שלך, אנחנו ממליצים על תבנית "${ROUTINE_TEMPLATES[suggestedTemplate]?.nameHe || suggestedTemplate}". רוצה להחיל אותה?`,
      buttons: [
        { label: 'אולי אחר כך' },
        { label: 'החל תבנית', primary: true, action: () => {
          showModal('modal-routine-template');
          setTimeout(() => previewTemplate(suggestedTemplate), 100);
        }}
      ]
    });
  }, 400);
}

function skipOnboarding() {
  localStorage.setItem('tiger8_onboarded', '1');
  closeModal('modal-onboarding');
}
