// ============ APP INIT ============
// This file bootstraps the app. Loaded last after all other JS files.

// ── PWA Install Prompt ───────────────────────────────────────────────────────
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  // Show banner if not previously dismissed
  if (!localStorage.getItem('tiger8_install_dismissed')) {
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'block';
  }
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  showToast('🐯 Tiger8 הותקן בהצלחה!');
});

function installApp() {
  if (!_deferredInstallPrompt) {
    // iOS / browser without beforeinstallprompt
    showToast('פתח תפריט הדפדפן → "הוסף למסך הבית"');
    return;
  }
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') {
      showToast('🐯 Tiger8 הותקן!');
    }
    _deferredInstallPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.style.display = 'none';
  });
}

function dismissInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.style.display = 'none';
  localStorage.setItem('tiger8_install_dismissed', '1');
}

// ── App Init ─────────────────────────────────────────────────────────────────

window.onload = async () => {
  await loadDB();
  restoreActiveWorkout();
  rebuildExerciseDatalist();
  applyTheme();
  renderHome();
  renderSupplementReminders();
  scheduleSupplementNotifications();
  initWeightDate();
  if(DB.plans) renderPlans();
  initModalCloseOnBackdrop();
  attachExerciseAutocomplete('planExInput', name => addExToPlanByName(name));
  attachExerciseAutocomplete('newExInput', name => addExerciseToNewByName(name));

  // Check if first-launch onboarding is needed
  if (!DB.user.name && !localStorage.getItem('tiger8_onboarded')) {
    showOnboarding();
  }

  // Hide loading splash
  const splash = document.getElementById('loadingSplash');
  if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 300); }
};
