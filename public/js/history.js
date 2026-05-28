// ============ HISTORY ============

function renderHistory() {
  const el = document.getElementById('historyList');
  if(!DB.workouts.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><div class="empty-title">אין היסטוריה</div><div class="empty-text">בצע אימון ראשון</div></div>';
    return;
  }
  const sorted = [...DB.workouts].reverse();
  el.innerHTML = sorted.map(w => {
    const d = new Date(w.date).toLocaleDateString('he-IL');
    const dur = w.duration ? `${Math.floor(w.duration/60)} דק'` : '';
    const sets = w.exercises.reduce((a,ex)=>a+ex.sets.filter(s=>s.reps||s.weight).length,0);
    return `<div class="history-item" style="position:relative;padding-left:80px">
      <div onclick="showWorkoutDetail(${w.id})">
        <div class="history-date">${d} ${dur?'• '+dur:''}</div>
        <div class="history-name">${w.name}</div>
        <div class="history-summary">${w.exercises.length} תרגילים • ${sets} סטים${w.muscles?.length?' • '+w.muscles.join(', '):''}</div>
      </div>
      <button onclick="deleteWorkout(${w.id})" style="position:absolute;top:50%;left:12px;transform:translateY(-50%);background:var(--accent2-glow);border:1px solid rgba(255,107,107,0.25);color:var(--accent2);border-radius:10px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:Rubik,sans-serif;font-weight:600;transition:all 0.15s">🗑</button>
    </div>`;
  }).join('');
}

function deleteWorkout(id) {
  showDialog({
    icon: '🗑',
    title: 'מחיקת אימון?',
    msg: 'האימון יוסר מההיסטוריה והשיאים יחושבו מחדש',
    buttons: [
      { label: 'ביטול' },
      { label: 'מחק', primary: true, action: () => {
        DB.workouts = DB.workouts.filter(w=>w.id!==id);
        DB.prs = {};
        DB.workouts.forEach(w=>updatePRs(w));
        saveDB();
        renderHistory();
        renderHome();
        showToast('האימון נמחק');
      }}
    ]
  });
}

function showWorkoutDetail(id) {
  const w = DB.workouts.find(x=>x.id===id);
  if(!w) return;
  const el = document.getElementById('workoutDetailContent');
  const d = new Date(w.date).toLocaleDateString('he-IL');
  const dur = w.duration ? ` \u2022 ${Math.floor(w.duration/60)}m ${w.duration%60}s` : '';
  el.innerHTML = `
    <div style="font-size:20px;font-weight:800;margin-bottom:4px">${w.name}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:20px">${d}${dur}</div>
    ${w.exercises.map(ex => `
      <div style="margin-bottom:16px">
        <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:var(--accent)">${ex.name}</div>
        ${ex.sets.filter(s=>s.reps||s.weight).map((s,i)=>`
          <div style="display:flex;gap:12px;font-size:13px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text3)">סט ${i+1}</span>
            <span style="font-weight:600">${s.weight||0} ק"ג</span>
            <span style="color:var(--text2)">&times;</span>
            <span style="font-weight:600">${s.reps||0} חזרות</span>
            ${s.done?'<span style="color:var(--accent3)">&check;</span>':''}
          </div>`).join('')}
      </div>
    `).join('')}`;
  showModal('modal-workout-detail');
}

function switchHistoryTab(tab, btn) {
  document.querySelectorAll('#historyInnerTabs .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('historyList').style.display = tab==='list'?'block':'none';
  document.getElementById('historyProgress').style.display = tab==='progress'?'block':'none';
  if(tab==='progress') renderProgressCharts();
}

function renderProgressCharts() {
  const last8 = DB.workouts.slice(-8);
  const labels = last8.map(w=>new Date(w.date).toLocaleDateString(undefined,{month:'numeric',day:'numeric'}));
  const volumes = last8.map(w=>w.exercises.reduce((a,ex)=>a+ex.sets.reduce((b,s)=>{
    const wt=parseFloat(s.weight)||0, rp=parseInt(s.reps)||0; return b+(wt*rp);
  },0),0));

  const ctx1 = document.getElementById('volumeChart');
  if(ctx1._chart) ctx1._chart.destroy();
  ctx1._chart = new Chart(ctx1, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Volume (kg)', data:volumes, backgroundColor:'rgba(108,92,231,0.5)', borderColor:'#6C5CE7', borderWidth:2, borderRadius:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#8B95A8',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#8B95A8',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}} }
  });

  const dayLabels = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
  const dayCounts = [0,0,0,0,0,0,0];
  DB.workouts.forEach(w=>{ dayCounts[new Date(w.date).getDay()]++; });
  const ctx2 = document.getElementById('freqChart');
  if(ctx2._chart) ctx2._chart.destroy();
  ctx2._chart = new Chart(ctx2, {
    type:'bar',
    data:{ labels:dayLabels, datasets:[{ data:dayCounts, backgroundColor:'rgba(255,107,107,0.4)', borderColor:'#FF6B6B', borderWidth:2, borderRadius:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9999bb',font:{size:11}}},y:{ticks:{color:'#9999bb',font:{size:10},stepSize:1},grid:{color:'rgba(255,255,255,0.05)'}}} }
  });

  // Muscle group volume breakdown
  const muscleVolume = {};
  DB.workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const libEx = (DB.exercises||[]).find(e => e.name === ex.name);
      const muscle = libEx?.muscle || 'other';
      const vol = ex.sets.reduce((a,s) => a + (parseFloat(s.weight)||0) * (parseInt(s.reps)||0), 0);
      muscleVolume[muscle] = (muscleVolume[muscle] || 0) + vol;
    });
  });
  const muscleColors = {
    chest:'#6C5CE7', back:'#FF6B6B', shoulders:'#FECA57', biceps:'#00D2D3',
    triceps:'#A29BFE', legs:'#00B894', core:'#FD79A8', cardio:'#74B9FF', other:'#8B95A8'
  };
  const mLabels = Object.keys(muscleVolume);
  const mData   = mLabels.map(k => Math.round(muscleVolume[k]));
  const mColors = mLabels.map(k => muscleColors[k] || '#9999bb');
  const ctx3 = document.getElementById('muscleChart');
  if(ctx3._chart) ctx3._chart.destroy();
  ctx3._chart = new Chart(ctx3, {
    type: 'doughnut',
    data: { labels: mLabels.map(l => l.charAt(0).toUpperCase()+l.slice(1)), datasets:[{ data: mData, backgroundColor: mColors, borderWidth: 2, borderColor: 'var(--bg)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'right', labels:{ color:'#9999bb', font:{size:11}, boxWidth:14 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} kg·reps` } }
      }
    }
  });
}
