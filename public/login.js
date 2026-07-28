const msgEl = document.getElementById('auth-msg');

function setMsg(text, kind) {
  msgEl.textContent = text || '';
  msgEl.className = 'auth-msg' + (kind ? ' ' + kind : '');
}

function setLoading(btn, on) {
  btn.disabled = on;
  btn.classList.toggle('loading', on);
}

document.querySelectorAll('.seg-btn').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach(x => {
      x.classList.remove('active');
      x.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.auth-form').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    t.setAttribute('aria-selected', 'true');
    document.getElementById('form-' + t.dataset.tab).classList.add('active');
    setMsg('');
  });
});

const ERRORS = {
  'invalid email':           'אימייל לא תקין',
  'password too weak':       'הסיסמה לא עומדת בדרישות',
  'email already registered':'אימייל זה כבר רשום',
  'invalid credentials':     'אימייל או סיסמה שגויים',
  'missing credentials':     'נא למלא אימייל וסיסמה',
  'use google login':        'חשבון זה נרשם דרך Google — השתמש בכפתור למטה',
};

async function postAuth(path, email, password, btn) {
  setLoading(btn, true);
  setMsg('');
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(ERRORS[data.error] || data.error || 'משהו השתבש. נסה שוב.', 'err');
      return;
    }
    setMsg('מועבר לאפליקציה...', 'ok');
    window.location.href = '/';
  } catch {
    setMsg('שגיאת רשת. בדוק חיבור ונסה שוב.', 'err');
  } finally {
    setLoading(btn, false);
  }
}

document.getElementById('form-login').addEventListener('submit', e => {
  e.preventDefault();
  postAuth('/api/auth/login',
    document.getElementById('login-email').value.trim(),
    document.getElementById('login-password').value,
    e.target.querySelector('.submit-btn'));
});

document.getElementById('form-signup').addEventListener('submit', e => {
  e.preventDefault();
  postAuth('/api/auth/signup',
    document.getElementById('signup-email').value.trim(),
    document.getElementById('signup-password').value,
    e.target.querySelector('.submit-btn'));
});

const pwInput = document.getElementById('signup-password');
const checks = {
  'req-len':     v => v.length >= 8,
  'req-upper':   v => /[A-Z]/.test(v),
  'req-lower':   v => /[a-z]/.test(v),
  'req-digit':   v => /\d/.test(v),
  'req-special': v => /[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]/.test(v),
};
pwInput.addEventListener('input', () => {
  const v = pwInput.value;
  for (const [id, fn] of Object.entries(checks)) {
    document.getElementById(id).classList.toggle('ok', fn(v));
  }
});

fetch('/api/auth/me', { credentials: 'same-origin' })
  .then(r => { if (r.ok) window.location.href = '/'; })
  .catch(() => {});
