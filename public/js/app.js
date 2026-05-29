// ============ APP INIT ============
// This file bootstraps the app. Loaded last after all other JS files.

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
