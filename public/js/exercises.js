// ============ EXERCISE LIBRARY & ROUTINE TEMPLATES ============

// Hebrew name lookup for exercises
const EX_NAME_HE = {
  'Bench Press':'לחיצת חזה','Incline Bench Press':'לחיצת חזה משופע','Decline Bench Press':'לחיצת חזה שיפוע שלילי',
  'Dumbbell Flyes':'פרפר משקולות','Incline Dumbbell Press':'לחיצה משופעת משקולות','Cable Crossover':'כבל צולב',
  'Chest Dip':'מקבילים חזה','Push-Up':'שכיבות סמיכה','Pec Deck':'מכונת פרפר','Dumbbell Pullover':'פולאובר',
  'Deadlift':'דדליפט','Pull-Up':'מתח עליון','Chin-Up':'מתח צ\'ין','Barbell Row':'חתירה עם מוט',
  'Dumbbell Row':'חתירה חד צדדית','T-Bar Row':'חתירת טי-בר','Lat Pulldown':'מתיחה עליונה',
  'Seated Cable Row':'חתירת כבל ישיבה','Rack Pull':'ראק פול','Good Morning':'גוד מורנינג',
  'Hyperextension':'היפראקסטנשן','Straight-Arm Pulldown':'מתיחה ישרה',
  'Overhead Press':'לחיצת כתפיים','Dumbbell Shoulder Press':'לחיצת כתפיים משקולות','Arnold Press':'לחיצת ארנולד',
  'Lateral Raise':'הרמות צד','Front Raise':'הרמות קדמיות','Rear Delt Fly':'פרפר אחורי',
  'Face Pull':'פייס פול','Upright Row':'חתירה זקופה','Shrugs':'שרגס','Cable Lateral Raise':'הרמת צד כבל',
  'Barbell Curl':'כפיפות מוט','Dumbbell Curl':'כפיפות משקולות','Hammer Curl':'כפיפות פטיש',
  'Incline Dumbbell Curl':'כפיפות משופע','Cable Curl':'כפיפות כבל','Preacher Curl':'כפיפות פריצ\'ר',
  'Concentration Curl':'כפיפות ריכוז','Spider Curl':'כפיפות ספיידר','EZ-Bar Curl':'כפיפות EZ',
  'Tricep Pushdown':'לחיצת כבל טרי','Overhead Tricep Extension':'הארכה מעל הראש',
  'Skull Crusher':'סקאל קראשר','Tricep Dip':'מקבילים טרי','Close-Grip Bench Press':'לחיצה צרה',
  'Cable Kickback':'קיקבק כבל','Diamond Push-Up':'שכיבות יהלום',
  'Squat':'סקוואט','Front Squat':'סקוואט קדמי','Romanian Deadlift':'דדליפט רומני',
  'Leg Press':'מכבש רגליים','Leg Curl':'כפיפת ירך','Leg Extension':'יישור ברך',
  'Hip Thrust':'היפ ת\'ראסט','Calf Raise':'הרמת עקבים','Seated Calf Raise':'הרמת עקבים ישיבה',
  'Bulgarian Split Squat':'סקוואט בולגרי','Hack Squat':'האק סקוואט','Sumo Deadlift':'דדליפט סומו',
  'Goblet Squat':'גובלט סקוואט','Lunges':'לאנג\'ס','Step-Up':'סטפ-אפ','Glute Bridge':'גשר ישבן',
  'Plank':'פלאנק','Crunch':'כפיפות בטן','Sit-Up':'סיט-אפ','Leg Raise':'הרמות רגליים',
  'Russian Twist':'רוסיאן טוויסט','Ab Rollout':'גלגל בטן','Cable Crunch':'כפיפות כבל',
  'Hanging Leg Raise':'הרמת רגליים בתליה','Side Plank':'פלאנק צידי','Mountain Climber':'מטפסי הרים','Dead Bug':'דד באג',
  'Treadmill Run':'ריצה על הליכון','Rowing Machine':'מכונת חתירה','Stationary Bike':'אופני כושר',
  'Jump Rope':'קפיצה בחבל','Battle Ropes':'חבלי קרב','Box Jump':'קפיצה על קופסה',
  'Burpee':'ברפי','Stair Climber':'מטפס מדרגות'
};

// Helper: get display name (Hebrew + English)
function exDisplayName(name) {
  const he = EX_NAME_HE[name];
  return he ? `${he} (${name})` : name;
}

// Helper: get just the Hebrew name if it exists
function exHebrewName(name) {
  return EX_NAME_HE[name] || name;
}

const EXERCISE_LIBRARY = [
  // ── CHEST ──
  { id: 'e1', name: 'Bench Press', muscle: 'chest', desc: 'Flat barbell press, king of chest exercises', isCustom: false },
  { id: 'e2', name: 'Incline Bench Press', muscle: 'chest', desc: 'Barbell press at 30-45° incline, upper chest focus', isCustom: false },
  { id: 'e3', name: 'Decline Bench Press', muscle: 'chest', desc: 'Barbell press on decline, lower chest focus', isCustom: false },
  { id: 'e4', name: 'Dumbbell Flyes', muscle: 'chest', desc: 'Chest stretch and squeeze with dumbbells', isCustom: false },
  { id: 'e5', name: 'Incline Dumbbell Press', muscle: 'chest', desc: 'Dumbbell press on incline bench', isCustom: false },
  { id: 'e6', name: 'Cable Crossover', muscle: 'chest', desc: 'Cable fly for constant tension on chest', isCustom: false },
  { id: 'e7', name: 'Chest Dip', muscle: 'chest', desc: 'Bodyweight dip leaning forward for chest', isCustom: false },
  { id: 'e8', name: 'Push-Up', muscle: 'chest', desc: 'Classic bodyweight chest exercise', isCustom: false },
  { id: 'e9', name: 'Pec Deck', muscle: 'chest', desc: 'Machine fly for chest isolation', isCustom: false },
  { id: 'e10', name: 'Dumbbell Pullover', muscle: 'chest', desc: 'Targets chest and lat with arc motion', isCustom: false },
  // ── BACK ──
  { id: 'e11', name: 'Deadlift', muscle: 'back', desc: 'Full-body pull from floor, king of back builders', isCustom: false },
  { id: 'e12', name: 'Pull-Up', muscle: 'back', desc: 'Overhand grip bodyweight pull', isCustom: false },
  { id: 'e13', name: 'Chin-Up', muscle: 'back', desc: 'Underhand grip bodyweight pull, more bicep', isCustom: false },
  { id: 'e14', name: 'Barbell Row', muscle: 'back', desc: 'Bent-over barbell row for mid and upper back', isCustom: false },
  { id: 'e15', name: 'Dumbbell Row', muscle: 'back', desc: 'Single-arm row for back thickness', isCustom: false },
  { id: 'e16', name: 'T-Bar Row', muscle: 'back', desc: 'Chest-supported or free T-bar for mass', isCustom: false },
  { id: 'e17', name: 'Lat Pulldown', muscle: 'back', desc: 'Cable pulldown for lat width', isCustom: false },
  { id: 'e18', name: 'Seated Cable Row', muscle: 'back', desc: 'Cable row for mid-back thickness', isCustom: false },
  { id: 'e19', name: 'Rack Pull', muscle: 'back', desc: 'Partial deadlift from knee height for upper back', isCustom: false },
  { id: 'e20', name: 'Good Morning', muscle: 'back', desc: 'Barbell hip hinge for lower back and hamstrings', isCustom: false },
  { id: 'e21', name: 'Hyperextension', muscle: 'back', desc: 'Back extension on GHD or roman chair', isCustom: false },
  { id: 'e22', name: 'Straight-Arm Pulldown', muscle: 'back', desc: 'Cable move for lat isolation', isCustom: false },
  // ── SHOULDERS ──
  { id: 'e23', name: 'Overhead Press', muscle: 'shoulders', desc: 'Barbell press overhead for overall shoulder mass', isCustom: false },
  { id: 'e24', name: 'Dumbbell Shoulder Press', muscle: 'shoulders', desc: 'Seated or standing dumbbell press overhead', isCustom: false },
  { id: 'e25', name: 'Arnold Press', muscle: 'shoulders', desc: 'Rotational DB press hitting all 3 delt heads', isCustom: false },
  { id: 'e26', name: 'Lateral Raise', muscle: 'shoulders', desc: 'Side raise for medial delt width', isCustom: false },
  { id: 'e27', name: 'Front Raise', muscle: 'shoulders', desc: 'Forward raise for anterior delt', isCustom: false },
  { id: 'e28', name: 'Rear Delt Fly', muscle: 'shoulders', desc: 'Bent-over fly for rear delts and upper back', isCustom: false },
  { id: 'e29', name: 'Face Pull', muscle: 'shoulders', desc: 'Cable pull to face for rear delt and rotator cuff', isCustom: false },
  { id: 'e30', name: 'Upright Row', muscle: 'shoulders', desc: 'Barbell or cable row to chin for traps and delts', isCustom: false },
  { id: 'e31', name: 'Shrugs', muscle: 'shoulders', desc: 'Barbell or dumbbell shrug for traps', isCustom: false },
  { id: 'e32', name: 'Cable Lateral Raise', muscle: 'shoulders', desc: 'Constant-tension lateral raise on cable', isCustom: false },
  // ── BICEPS ──
  { id: 'e33', name: 'Barbell Curl', muscle: 'biceps', desc: 'Classic barbell curl for bicep mass', isCustom: false },
  { id: 'e34', name: 'Dumbbell Curl', muscle: 'biceps', desc: 'Alternating or simultaneous dumbbell curl', isCustom: false },
  { id: 'e35', name: 'Hammer Curl', muscle: 'biceps', desc: 'Neutral grip for brachialis and brachioradialis', isCustom: false },
  { id: 'e36', name: 'Incline Dumbbell Curl', muscle: 'biceps', desc: 'Long-head bicep stretch on incline bench', isCustom: false },
  { id: 'e37', name: 'Cable Curl', muscle: 'biceps', desc: 'Constant tension curl on cable machine', isCustom: false },
  { id: 'e38', name: 'Preacher Curl', muscle: 'biceps', desc: 'EZ-bar or dumbbell curl on preacher pad', isCustom: false },
  { id: 'e39', name: 'Concentration Curl', muscle: 'biceps', desc: 'Seated single-arm curl for peak contraction', isCustom: false },
  { id: 'e40', name: 'Spider Curl', muscle: 'biceps', desc: 'Prone incline curl for full range of motion', isCustom: false },
  { id: 'e41', name: 'EZ-Bar Curl', muscle: 'biceps', desc: 'Reduces wrist strain vs straight bar', isCustom: false },
  // ── TRICEPS ──
  { id: 'e42', name: 'Tricep Pushdown', muscle: 'triceps', desc: 'Cable pushdown for tricep isolation', isCustom: false },
  { id: 'e43', name: 'Overhead Tricep Extension', muscle: 'triceps', desc: 'Long-head tricep stretch overhead', isCustom: false },
  { id: 'e44', name: 'Skull Crusher', muscle: 'triceps', desc: 'EZ-bar or dumbbell lying tricep extension', isCustom: false },
  { id: 'e45', name: 'Tricep Dip', muscle: 'triceps', desc: 'Upright torso bodyweight dip for triceps', isCustom: false },
  { id: 'e46', name: 'Close-Grip Bench Press', muscle: 'triceps', desc: 'Narrow grip bench for tricep mass', isCustom: false },
  { id: 'e47', name: 'Cable Kickback', muscle: 'triceps', desc: 'Rear cable extension for tricep squeeze', isCustom: false },
  { id: 'e48', name: 'Diamond Push-Up', muscle: 'triceps', desc: 'Narrow hand push-up for triceps', isCustom: false },
  // ── LEGS ──
  { id: 'e49', name: 'Squat', muscle: 'legs', desc: 'King of leg exercises, full quad and glute builder', isCustom: false },
  { id: 'e50', name: 'Front Squat', muscle: 'legs', desc: 'Barbell in front, more quad emphasis', isCustom: false },
  { id: 'e51', name: 'Romanian Deadlift', muscle: 'legs', desc: 'Hip hinge targeting hamstrings and glutes', isCustom: false },
  { id: 'e52', name: 'Leg Press', muscle: 'legs', desc: 'Machine press for quads, hamstrings and glutes', isCustom: false },
  { id: 'e53', name: 'Leg Curl', muscle: 'legs', desc: 'Lying or seated hamstring isolation', isCustom: false },
  { id: 'e54', name: 'Leg Extension', muscle: 'legs', desc: 'Machine quad isolation', isCustom: false },
  { id: 'e55', name: 'Hip Thrust', muscle: 'legs', desc: 'Barbell glute bridge for maximum glute activation', isCustom: false },
  { id: 'e56', name: 'Calf Raise', muscle: 'legs', desc: 'Standing calf raise for gastrocnemius', isCustom: false },
  { id: 'e57', name: 'Seated Calf Raise', muscle: 'legs', desc: 'Seated version targeting soleus', isCustom: false },
  { id: 'e58', name: 'Bulgarian Split Squat', muscle: 'legs', desc: 'Rear-foot elevated split squat', isCustom: false },
  { id: 'e59', name: 'Hack Squat', muscle: 'legs', desc: 'Machine or barbell hack squat for quads', isCustom: false },
  { id: 'e60', name: 'Sumo Deadlift', muscle: 'legs', desc: 'Wide stance pull targeting inner thigh and glutes', isCustom: false },
  { id: 'e61', name: 'Goblet Squat', muscle: 'legs', desc: 'Front-loaded squat with dumbbell or kettlebell', isCustom: false },
  { id: 'e62', name: 'Lunges', muscle: 'legs', desc: 'Walking or stationary lunges for legs', isCustom: false },
  { id: 'e63', name: 'Step-Up', muscle: 'legs', desc: 'Box step-up for quad and glute activation', isCustom: false },
  { id: 'e64', name: 'Glute Bridge', muscle: 'legs', desc: 'Floor hip extension targeting glutes', isCustom: false },
  // ── CORE ──
  { id: 'e65', name: 'Plank', muscle: 'core', desc: 'Isometric core hold for stability', isCustom: false },
  { id: 'e66', name: 'Crunch', muscle: 'core', desc: 'Classic upper ab crunch', isCustom: false },
  { id: 'e67', name: 'Sit-Up', muscle: 'core', desc: 'Full range of motion abdominal exercise', isCustom: false },
  { id: 'e68', name: 'Leg Raise', muscle: 'core', desc: 'Lying or hanging lower ab exercise', isCustom: false },
  { id: 'e69', name: 'Russian Twist', muscle: 'core', desc: 'Rotational core exercise for obliques', isCustom: false },
  { id: 'e70', name: 'Ab Rollout', muscle: 'core', desc: 'Wheel rollout for deep core and stability', isCustom: false },
  { id: 'e71', name: 'Cable Crunch', muscle: 'core', desc: 'Weighted cable crunch for ab development', isCustom: false },
  { id: 'e72', name: 'Hanging Leg Raise', muscle: 'core', desc: 'Bar hang with leg raise for lower abs', isCustom: false },
  { id: 'e73', name: 'Side Plank', muscle: 'core', desc: 'Lateral isometric hold for obliques', isCustom: false },
  { id: 'e74', name: 'Mountain Climber', muscle: 'core', desc: 'Dynamic plank with alternating knee drives', isCustom: false },
  { id: 'e75', name: 'Dead Bug', muscle: 'core', desc: 'Lying opposite arm-leg extension for stability', isCustom: false },
  // ── CARDIO / CONDITIONING ──
  { id: 'e76', name: 'Treadmill Run', muscle: 'cardio', desc: 'Steady-state or interval running', isCustom: false },
  { id: 'e77', name: 'Rowing Machine', muscle: 'cardio', desc: 'Full-body cardio on erg rower', isCustom: false },
  { id: 'e78', name: 'Stationary Bike', muscle: 'cardio', desc: 'Low-impact cycling cardio', isCustom: false },
  { id: 'e79', name: 'Jump Rope', muscle: 'cardio', desc: 'High-calorie cardio and coordination', isCustom: false },
  { id: 'e80', name: 'Battle Ropes', muscle: 'cardio', desc: 'High-intensity rope slams and waves', isCustom: false },
  { id: 'e81', name: 'Box Jump', muscle: 'cardio', desc: 'Explosive plyometric for power and cardio', isCustom: false },
  { id: 'e82', name: 'Burpee', muscle: 'cardio', desc: 'Full-body conditioning movement', isCustom: false },
  { id: 'e83', name: 'Stair Climber', muscle: 'cardio', desc: 'Machine stair climbing for legs and cardio', isCustom: false },
];

const ROUTINE_TEMPLATES = {
  full_body: {
    nameHe: 'Full Body', icon: '💪',
    desc: '3x/week — train the whole body each session. Great for beginners.',
    weekPlan: { sun: 'Full Body A', mon: 'Rest', tue: 'Full Body B', wed: 'Rest', thu: 'Full Body A', fri: 'Rest', sat: 'Rest' },
    plans: [
      { name: 'Full Body A', exercises: ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Plank'] },
      { name: 'Full Body B', exercises: ['Romanian Deadlift', 'Incline Bench Press', 'Lat Pulldown', 'Dumbbell Shoulder Press', 'Crunch'] }
    ]
  },
  upper_lower: {
    nameHe: 'Upper / Lower', icon: '⚡',
    desc: '4x/week — 2 upper body and 2 lower body sessions.',
    weekPlan: { sun: 'Upper Body', mon: 'Lower Body', tue: 'Rest', wed: 'Upper Body', thu: 'Lower Body', fri: 'Rest', sat: 'Rest' },
    plans: [
      { name: 'Upper Body', exercises: ['Bench Press', 'Overhead Press', 'Barbell Row', 'Pull-Up', 'Barbell Curl', 'Tricep Pushdown'] },
      { name: 'Lower Body', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'] }
    ]
  },
  ppl: {
    nameHe: 'Push / Pull / Legs', icon: '🔥',
    desc: '6x/week — classic PPL for intermediate to advanced lifters.',
    weekPlan: { sun: 'Push', mon: 'Pull', tue: 'Legs', wed: 'Rest', thu: 'Push', fri: 'Pull', sat: 'Legs' },
    plans: [
      { name: 'Push', exercises: ['Bench Press', 'Incline Bench Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown', 'Skull Crusher'] },
      { name: 'Pull', exercises: ['Deadlift', 'Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl', 'Hammer Curl'] },
      { name: 'Legs', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise'] }
    ]
  }
};

// Seed exercise library on first run
function seedExercises() {
  if (DB.exercises === null) {
    DB.exercises = EXERCISE_LIBRARY.map(e => ({ ...e }));
  }
}

// Rebuild the HTML5 datalist for exercise autocomplete
function rebuildExerciseDatalist() {
  const dl = document.getElementById('ex-datalist');
  if (!dl) return;
  dl.innerHTML = (DB.exercises || []).map(e =>
    `<option value="${e.name}">`
  ).join('');
}

// ============ ROUTINE TEMPLATES UI ============
let selectedTemplate = null;

function renderTemplateModal() {
  selectedTemplate = null;
  document.getElementById('templatePreview').innerHTML = '';
  const el = document.getElementById('templateOptions');
  el.innerHTML = Object.entries(ROUTINE_TEMPLATES).map(([key, t]) => `
    <div id="tpl-card-${key}" onclick="previewTemplate('${key}')"
      style="display:flex;align-items:flex-start;gap:14px;padding:14px;background:var(--bg3);border-radius:var(--radius);margin-bottom:10px;cursor:pointer;border:2px solid transparent;transition:all 0.2s">
      <div style="font-size:32px;flex-shrink:0">${t.icon}</div>
      <div style="flex:1">
        <div style="font-weight:800;font-size:16px;margin-bottom:4px">${t.nameHe}</div>
        <div style="font-size:12px;color:var(--text2)">${t.desc}</div>
      </div>
    </div>`).join('');
}

function previewTemplate(key) {
  selectedTemplate = key;
  document.querySelectorAll('[id^="tpl-card-"]').forEach(c => c.style.borderColor = 'transparent');
  const card = document.getElementById('tpl-card-' + key);
  if (card) card.style.borderColor = 'var(--accent)';

  const t = ROUTINE_TEMPLATES[key];
  const dayLabels = { sun:'א׳', mon:'ב׳', tue:'ג׳', wed:'ד׳', thu:'ה׳', fri:'ו׳', sat:'ש׳' };
  const dayKeys = ['sun','mon','tue','wed','thu','fri','sat'];

  // Build a checkbox-grid for each plan: which days should it run?
  const defaultAssignment = {}; // planName -> Set of day keys
  Object.entries(t.weekPlan).forEach(([day, planName]) => {
    if (planName && planName !== 'Rest') {
      if (!defaultAssignment[planName]) defaultAssignment[planName] = new Set();
      defaultAssignment[planName].add(day);
    }
  });

  const planRows = t.plans.map(p => {
    const assignedDays = defaultAssignment[p.name] || new Set();
    const checkboxes = dayKeys.map(d => `
      <label style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer">
        <span style="font-size:10px;color:var(--text3);font-weight:700">${dayLabels[d]}</span>
        <input type="checkbox" data-plan="${p.name}" data-day="${d}" ${assignedDays.has(d) ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
      </label>`).join('');
    return `
      <div style="margin-bottom:14px;padding:12px;background:var(--bg3);border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:var(--accent)">${p.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${p.exercises.slice(0,4).join(' · ')}${p.exercises.length>4?'…':''}</div>
        <div style="display:flex;justify-content:space-between">${checkboxes}</div>
      </div>`;
  }).join('');

  document.getElementById('templatePreview').innerHTML = `
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
      <div class="card-title" style="margin-bottom:10px">בחר ימים לכל תוכנית</div>
      ${planRows}
      <div style="font-size:11px;color:var(--text2);margin-bottom:14px">ימים שלא נבחרו יישארו ריקים (מנוחה)</div>
      <button class="btn btn-primary btn-full" onclick="applyTemplate('${key}')">✅ החל תבנית</button>
    </div>`;
}

function applyTemplate(key) {
  const t = ROUTINE_TEMPLATES[key];
  if (!t) return;

  // Read user's day selections from checkboxes
  const newWeekPlan = { sun:'', mon:'', tue:'', wed:'', thu:'', fri:'', sat:'' };
  document.querySelectorAll('#templatePreview input[type=checkbox]').forEach(cb => {
    if (cb.checked) newWeekPlan[cb.dataset.day] = cb.dataset.plan;
  });

  db.update(d => {
    Object.assign(d.weekPlan, newWeekPlan);
    t.plans.forEach(tp => {
      if (!d.plans.some(p => p.name === tp.name)) {
        d.plans.push({ id: Date.now() + Math.floor(Math.random() * 1000), name: tp.name, desc: t.nameHe, exercises: tp.exercises.map(name => ({ name, restSeconds: 90 })) });
      }
    });
  });
  renderPlans();
  renderTodayPlan();
  renderWeekCalendar();
  showToast('✅ ' + t.nameHe + ' הוחל!');

  // Show edit options for the applied plans
  document.getElementById('templateOptions').innerHTML = '';
  document.getElementById('templatePreview').innerHTML = `
    <div style="padding:16px 0">
      <div style="font-size:15px;font-weight:800;color:var(--accent3);margin-bottom:4px">✅ התבנית הוחלה!</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:16px">ערוך את התוכניות לפי הצורך:</div>
      ${t.plans.map(tp => {
        const plan = DB.plans.find(p => p.name === tp.name);
        if (!plan) return '';
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg3);border-radius:var(--radius);margin-bottom:8px;border:1px solid var(--border)">
            <div>
              <div style="font-weight:700;font-size:14px">${plan.name}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">${plan.exercises.length} תרגילים: ${plan.exercises.slice(0,3).map(e => typeof e === 'string' ? e : e.name).join(', ')}${plan.exercises.length>3?'...':''}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="closeModal('modal-routine-template');editPlan(${plan.id})">✏️ ערוך</button>
          </div>`;
      }).join('')}
      <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="closeModal('modal-routine-template')">סגור</button>
    </div>`;
}

// ============ CUSTOM AUTOCOMPLETE ============

const _muscleLabels = { chest:'חזה', back:'גב', shoulders:'כתפיים', biceps:'ביצפס', triceps:'טריצפס', legs:'רגליים', core:'בטן', cardio:'קרדיו' };

function attachExerciseAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.removeAttribute('list');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;flex:1;min-width:0';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';

  const dropdown = document.createElement('div');
  dropdown.style.cssText = 'position:absolute;top:calc(100% + 2px);left:0;right:0;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:220px;overflow-y:auto;display:none;box-shadow:0 6px 20px rgba(0,0,0,0.4)';
  wrapper.appendChild(dropdown);

  function renderDropdown(q) {
    const ql = q.toLowerCase();
    const matches = (DB.exercises || []).filter(e =>
      e.name.toLowerCase().includes(ql) || (EX_NAME_HE[e.name] || '').includes(q)
    ).slice(0, 10);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = matches.map(e => {
      const safe = e.name.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const label = _muscleLabels[e.muscle] || e.muscle;
      const he = EX_NAME_HE[e.name] || '';
      return `<div data-name="${safe}" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;display:flex;justify-content:space-between;align-items:center" onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''">
        <span style="font-weight:600">${he ? he + ' <span style=\"color:var(--text3);font-weight:400;font-size:11px\">' + safe + '</span>' : safe}</span>
        <span style="font-size:11px;color:var(--text3);flex-shrink:0;margin-right:8px">${label}</span>
      </div>`;
    }).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('[data-name]').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        onSelect(item.dataset.name);
        input.value = '';
        dropdown.style.display = 'none';
      });
    });
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) { dropdown.style.display = 'none'; return; }
    renderDropdown(q);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val) { onSelect(val); input.value = ''; dropdown.style.display = 'none'; }
    }
    if (e.key === 'Escape') dropdown.style.display = 'none';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
}

// ============ CUSTOM EXERCISES ============
function saveCustomExercise() {
  const name = document.getElementById('customExName').value.trim();
  const muscle = document.getElementById('customExMuscle').value;
  const desc = document.getElementById('customExDesc').value.trim();
  if (!name) { showToast('Enter a name for the exercise', 'error'); return; }
  if ((DB.exercises || []).some(e => e.name === name)) {
    showToast('An exercise with that name already exists', 'error'); return;
  }
  db.update(d => {
    d.exercises.push({ id: 'c_' + Date.now(), name, muscle, desc, isCustom: true });
  });
  rebuildExerciseDatalist();
  closeModal('modal-custom-exercise');
  document.getElementById('customExName').value = '';
  document.getElementById('customExDesc').value = '';
  showToast('✅ Exercise added to library');
  const lbl = document.getElementById('exLibraryLabel');
  if (lbl) lbl.textContent = `Exercise Library (${DB.exercises.length} exercises)`;
}
