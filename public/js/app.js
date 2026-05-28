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
};
