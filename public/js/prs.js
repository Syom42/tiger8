// ============ 1RM CALCULATOR ============
// Epley formula: 1RM = weight × (1 + reps/30)
function calc1RM() {
  const weight = parseFloat(document.getElementById('ormWeight').value);
  const reps   = parseInt(document.getElementById('ormReps').value);
  const el     = document.getElementById('ormResult');
  if (!weight || !reps || reps < 1) { el.innerHTML = ''; return; }

  const orm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

  // Build percentage table
  const percs = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  const rows = percs.map(p => {
    const kg = (orm * p / 100).toFixed(1);
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="color:var(--text2)">${p}%</span>
      <span style="font-weight:${p===100?'900':'600'};color:${p===100?'var(--accent)':'var(--text)'}">${kg} ק"ג</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="text-align:center;padding:16px 0 12px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:4px">חד-חזרה מקסימלי מוערך</div>
      <div style="font-size:48px;font-weight:900;color:var(--accent);line-height:1">${orm}</div>
      <div style="font-size:14px;color:var(--text2)">ק"ג</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:6px;letter-spacing:0.5px">טבלת אחוזים</div>
    ${rows}`;
}

function renderPRs() {
  const el = document.getElementById('prList');
  const prs = Object.entries(DB.prs);
  if(!prs.length) {
    el.innerHTML='<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-title">עוד אין שיאים</div><div class="empty-text">השלם אימונים כדי לרשום שיאים</div></div>';
    return;
  }
  el.innerHTML = prs.map(([name,pr])=>`
    <div class="pr-item">
      <div>
        <div class="pr-name">${name}</div>
        <div class="pr-date">${new Date(pr.date).toLocaleDateString('he-IL')}</div>
      </div>
      <div style="text-align:left">
        <div class="pr-value">${pr.weight} ק"ג</div>
        <div style="font-size:11px;color:var(--text2)">× ${pr.reps} חזרות</div>
      </div>
    </div>`).join('');

  const selEl = document.getElementById('exSelectForChart');
  selEl.innerHTML = '<select onchange="renderPRChart(this.value)" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;color:var(--text);font-family:Rubik,sans-serif;font-size:13px;outline:none"><option value="">-- בחר תרגיל --</option>' +
    prs.map(([n])=>`<option value="${n}">${n}</option>`).join('') + '</select>';
  if(prs.length) renderPRChart(prs[0][0]);
}

let prChartInstance = null;
function renderPRChart(exName) {
  if(!exName) return;
  const data = DB.workouts
    .filter(w=>w.exercises.some(e=>e.name===exName))
    .map(w=>{
      const ex = w.exercises.find(e=>e.name===exName);
      const best = ex.sets.reduce((b,s)=>{ const v=parseFloat(s.weight)||0; return v>b?v:b; },0);
      return { date: new Date(w.date).toLocaleDateString(undefined,{month:'numeric',day:'numeric'}), val: best };
    });
  const ctx = document.getElementById('prChart');
  if(prChartInstance) prChartInstance.destroy();
  prChartInstance = new Chart(ctx, {
    type:'line',
    data:{ labels:data.map(d=>d.date), datasets:[{ label:'משקל מקסימלי (ק"ג)', data:data.map(d=>d.val), borderColor:'#ffd700', backgroundColor:'rgba(255,215,0,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#ffd700', pointRadius:5 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9999bb',font:{size:10}}},y:{ticks:{color:'#9999bb',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}} }
  });
}
