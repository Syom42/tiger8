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

/* THEME TOGGLE LOGIC */
function toggleTheme() {
  db.update(d => {
    const currentTheme = d.theme || 'dark';
    d.theme = currentTheme === 'dark' ? 'light' : 'dark';
  });
  applyTheme();
}

function applyTheme() {
  const currentTheme = DB.theme || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  const themeVal = document.getElementById('themeValDisplay');
  if (themeVal) {
    themeVal.innerText = currentTheme === 'dark' ? 'מצב כהה' : 'מצב בהיר';
  }
}

// Ensure theme is applied on load
setTimeout(applyTheme, 0);
