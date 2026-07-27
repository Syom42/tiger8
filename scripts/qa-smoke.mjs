import assert from 'node:assert/strict';

const baseUrl = (process.env.QA_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const email = `qa-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}@example.test`;
const password = 'Tiger8!Qa2026';

function url(path) {
  return `${baseUrl}${path}`;
}

async function expectStatus(path, expectedStatus, options = {}) {
  const response = await fetch(url(path), { redirect: 'manual', ...options });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}, expected ${expectedStatus}`);
  return response;
}

await expectStatus('/', 200);
await expectStatus('/login.html', 200);
await expectStatus('/api/init', 401);

const signup = await expectStatus('/api/auth/signup', 200, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const cookie = signup.headers.get('set-cookie')?.split(';', 1)[0];
assert.ok(cookie, 'signup response did not set a session cookie');

const authHeaders = { Cookie: cookie };
await expectStatus('/api/init', 200, { headers: authHeaders });

await expectStatus('/api/profile', 200, {
  method: 'PUT',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'QA athlete', age: 30, height: 180, goal: 'strength' }),
});
const profileBootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const profileBootstrapData = await profileBootstrap.json();
assert.equal(profileBootstrapData.profile?.name, 'QA athlete', 'saved profile name did not return through bootstrap data');

await expectStatus('/api/plans', 200, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA plan',
    description: 'Development smoke test plan',
    exercises: [{ name: 'Bench Press', restSeconds: 90 }],
  }),
});
const createdPlans = await expectStatus('/api/plans', 200, { headers: authHeaders });
const planId = (await createdPlans.json()).find(plan => plan.name === 'QA plan')?.id;
assert.ok(planId, 'server did not assign an ID to the created plan');
const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const todayKey = dayKeys[new Date().getDay()];
await expectStatus('/api/week-plan', 200, {
  method: 'PUT',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ [todayKey]: planId }),
});

const planBootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const planBootstrapData = await planBootstrap.json();
assert.equal(planBootstrapData.weekPlan?.[todayKey], planId, 'saved plan was not assigned to today');
assert.equal(planBootstrapData.plans?.find(plan => plan.id === planId)?.exercises?.[0]?.exercise_name, 'Bench Press', 'saved plan exercises did not return through bootstrap data');

await expectStatus('/api/workouts', 200, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA workout',
    muscles: ['chest'],
    date: new Date().toISOString(),
    duration: 1800,
    exercises: [{
      name: 'Bench Press',
      restSeconds: 90,
      sets: [{ weight: '100', reps: '5', done: true }],
    }],
  }),
});

const bootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const bootstrapData = await bootstrap.json();
const savedWorkout = bootstrapData.workouts?.find(workout => workout.name === 'QA workout');
assert.ok(savedWorkout?.id, 'server did not assign an ID to the saved workout');
assert.equal(savedWorkout?.exercises?.[0]?.sets?.[0]?.done, true, 'saved workout did not return with its completed set');
assert.equal(Number(bootstrapData.prs?.['Bench Press']?.weight), 100, 'completed workout did not automatically create its personal record');

await expectStatus('/api/weight', 200, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ weight: 80.5, date: new Date().toISOString().slice(0, 10), note: 'QA measurement' }),
});

const weightBootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const weightBootstrapData = await weightBootstrap.json();
assert.equal(
  Number(weightBootstrapData.weight?.at(-1)?.weight),
  80.5,
  'saved body-weight measurement did not return through bootstrap data',
);

await expectStatus('/api/prs', 200, {
  method: 'PUT',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    'Bench Press': { weight: 100, reps: 5, date: new Date().toISOString() },
  }),
});

const recordsBootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const recordsBootstrapData = await recordsBootstrap.json();
assert.equal(Number(recordsBootstrapData.prs?.['Bench Press']?.weight), 100, 'saved personal record did not return through bootstrap data');

const today = new Date().toISOString().slice(0, 10);
await expectStatus('/api/supplements', 200, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'QA supplement', dose: '1 capsule', time: '08:00', enabled: true }),
});
const createdSupplements = await expectStatus('/api/supplements', 200, { headers: authHeaders });
const supplementId = (await createdSupplements.json()).find(supplement => supplement.name === 'QA supplement')?.id;
assert.ok(supplementId, 'server did not assign an ID to the created supplement');
await expectStatus('/api/supplements', 200, {
  method: 'PUT',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: supplementId, date: today, taken: true }),
});

const supplementsBootstrap = await expectStatus('/api/init', 200, { headers: authHeaders });
const supplementsBootstrapData = await supplementsBootstrap.json();
const savedSupplement = supplementsBootstrapData.supplements?.find(supplement => supplement.id === supplementId);
assert.ok(savedSupplement?.taken_dates?.includes(today), 'saved supplement adherence did not return through bootstrap data');

const secondEmail = `qa-${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}@example.test`;
const secondSignup = await expectStatus('/api/auth/signup', 200, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: secondEmail, password }),
});
const secondCookie = secondSignup.headers.get('set-cookie')?.split(';', 1)[0];
assert.ok(secondCookie, 'second signup response did not set a session cookie');
await expectStatus('/api/supplements', 404, {
  method: 'POST',
  headers: { Cookie: secondCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: supplementId, name: 'attempted overwrite', enabled: false }),
});

const coach = await expectStatus('/api/coach', 200, {
  method: 'POST',
  headers: { ...authHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'ענה במילה אחת: מוכן' }],
    temperature: 0,
    max_tokens: 20,
  }),
});
const coachBody = await coach.json();
assert.ok(coachBody.choices?.[0]?.message?.content?.trim(), 'coach response did not contain assistant content');

const google = await fetch(url('/api/auth/google'), { redirect: 'manual' });
if (google.status === 503 && process.env.QA_REQUIRE_GOOGLE !== '1') {
  console.warn('Google OAuth check skipped: Development credentials are not configured.');
} else {
  assert.equal(google.status, 302, `/api/auth/google returned ${google.status}, expected 302`);
  assert.match(
    google.headers.get('location') ?? '',
    /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/,
    'Google auth route did not redirect to Google OAuth',
  );
  const googleRedirect = new URL(google.headers.get('location'));
  assert.ok(googleRedirect.searchParams.get('state'), 'Google auth redirect did not include an OAuth state value');
}

console.log(`QA smoke tests passed against ${baseUrl}`);
