// ============ WEIGHT TRACKING ============

function saveWeight() {
  const w = parseFloat(document.getElementById('weightInput').value);
  if(!w||w<20||w>300) { showToast('הזן משקל תקין (20-300 ק"ג)', 'error'); return; }
  DB.weightLog.push({ weight:w, date:document.getElementById('weightDate').value, note:document.getElementById('weightNote').value });
  DB.weightLog.sort((a,b)=>new Date(a.date)-new Date(b.date));
  saveDB(); closeModal('modal-add-weight');
  document.getElementById('weightInput').value=''; document.getElementById('weightNote').value='';
  renderWeight();
  renderHome();
}

let weightChartInstance = null;
function renderWeight() {
  const logs = DB.weightLog;
  const cur = logs.length ? logs[logs.length-1].weight : null;
  document.getElementById('currentWeightDisplay').textContent = cur || '--';
  if(logs.length>=2) {
    const diff = (cur-logs[0].weight).toFixed(1);
    const el = document.getElementById('weightChangeDisplay');
    el.textContent = (diff>0?'+':'')+diff+' kg';
    el.style.color = diff<0?'var(--accent3)':'var(--accent2)';
  } else {
    document.getElementById('weightChangeDisplay').textContent = '--';
  }

  const ctx = document.getElementById('weightChart');
  if(weightChartInstance) weightChartInstance.destroy();
  if(logs.length>0) {
    weightChartInstance = new Chart(ctx, {
      type:'line',
      data:{ labels:logs.map(l=>new Date(l.date).toLocaleDateString(undefined,{month:'numeric',day:'numeric'})), datasets:[{ data:logs.map(l=>l.weight), borderColor:'#00D2D3', backgroundColor:'rgba(0,210,211,0.08)', fill:true, tension:0.4, pointBackgroundColor:'#00D2D3', pointRadius:4, borderWidth:2.5 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#8B95A8',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#8B95A8',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}} }
    });
  }

  const el = document.getElementById('weightLog');
  if(!logs.length) { el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:12px 0">אין רשומות עדיין</div>'; return; }
  const rev = [...logs].reverse();
  el.innerHTML = rev.map((l,i)=>{
    const prev = rev[i+1];
    const diff = prev ? (l.weight-prev.weight).toFixed(1) : null;
    return `<div class="weight-row">
      <div>
        <div class="weight-val">${l.weight} ק"ג</div>
        <div style="font-size:11px;color:var(--text2)">${new Date(l.date).toLocaleDateString('he-IL')}${l.note?` • ${l.note}`:''}</div>
      </div>
      ${diff!==null?`<span class="weight-change ${parseFloat(diff)>0?'weight-up':'weight-down'}">${parseFloat(diff)>0?'+':''}${diff}</span>`:''}
    </div>`;
  }).join('');
}

function initWeightDate() {
  const d = document.getElementById('weightDate');
  if(d) d.value = new Date().toISOString().split('T')[0];
}
