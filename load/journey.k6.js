// 30-user load test on STAGING only. See web/README.md "Load test".
// Run: k6 run load/journey.k6.js  (needs SUPABASE_ANON_KEY, SUPABASE_STAGING_SERVICE_ROLE_KEY)
import http from 'k6/http'
import exec from 'k6/execution'
import { check, fail } from 'k6'
import { Counter } from 'k6/metrics'

const BASE = 'https://awvaujmkbstkpsbaxpku.supabase.co' // staging ref only, never prod
const USERS = 30
const RACE_AT = 3 // question index whose submit is raced

const dupViolations = new Counter('dup_violations')
const lostAnswers = new Counter('lost_answers')

export const options = {
  scenarios: { journey: { executor: 'per-vu-iterations', vus: USERS, iterations: 1, maxDuration: '5m' } },
  thresholds: { checks: ['rate==1'], dup_violations: ['count==0'], lost_answers: ['count==0'] },
  setupTimeout: '180s',
  teardownTimeout: '180s',
}

function need(name) {
  const v = __ENV[name]
  if (!v) fail(`Missing required env var ${name} (see web/README.md "Load test")`)
  return v
}

const json = (r) => { try { return r.json() } catch (e) { return null } }
const hdr = (key, bearer) => ({ headers: { apikey: key, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' } })

function cleanup(svc, users) {
  if (!users.length) return
  const h = hdr(svc, svc)
  const del = (url) => {
    const r = http.del(url, null, h)
    if (r.status >= 300) console.error(`cleanup: DELETE ${url} failed: ${r.status} ${r.body}`)
  }
  const ids = users.map((u) => u.id).join(',')
  const sessions = (json(http.get(`${BASE}/rest/v1/game_sessions?select=id&player_id=in.(${ids})`, h)) || []).map((r) => r.id)
  // No FK cascades: answers -> game_sessions -> players -> auth user.
  if (sessions.length) {
    del(`${BASE}/rest/v1/answers?session_id=in.(${sessions.join(',')})`)
    del(`${BASE}/rest/v1/game_sessions?id=in.(${sessions.join(',')})`)
  }
  del(`${BASE}/rest/v1/players?id=in.(${ids})`)
  for (const u of users) {
    const r = http.del(`${BASE}/auth/v1/admin/users/${u.id}`, null, h)
    if (r.status >= 300) console.error(`cleanup: deleteUser(${u.id}) failed: ${r.status} ${r.body}`)
  }
}

// Leftovers from earlier aborted runs (setup aborted before teardown had any data).
function sweepLeftovers(svc) {
  const old = []
  for (let page = 1; ; page++) {
    const r = http.get(`${BASE}/auth/v1/admin/users?page=${page}&per_page=200`, hdr(svc, svc))
    const users = json(r)?.users
    if (!users) { console.error(`sweep: list users failed: ${r.status} ${r.body}`); break }
    users.filter((u) => /^load-.*@example\.com$/.test(u.email || '')).forEach((u) => old.push({ id: u.id }))
    if (users.length < 200) break
  }
  cleanup(svc, old)
}

export function setup() {
  const anon = need('SUPABASE_ANON_KEY')
  const svc = need('SUPABASE_STAGING_SERVICE_ROLE_KEY')
  sweepLeftovers(svc)
  const runId = Date.now().toString(36)
  const users = []
  try {
    for (let n = 0; n < USERS; n++) {
      const email = `load-${runId}-${n}@example.com`
      const c = http.post(`${BASE}/auth/v1/admin/users`, JSON.stringify({ email, email_confirm: true }), hdr(svc, svc))
      const id = json(c)?.id
      if (!id) throw new Error(`createUser failed: ${c.status} ${c.body}`)
      users.push({ id }) // push before the next step so cleanup sees it
      const l = http.post(`${BASE}/auth/v1/admin/generate_link`, JSON.stringify({ type: 'magiclink', email }), hdr(svc, svc))
      const lb = json(l)
      const th = lb?.hashed_token ?? lb?.properties?.hashed_token
      if (!th) throw new Error(`generate_link failed: ${l.status} ${l.body}`)
      const v = http.post(`${BASE}/auth/v1/verify`, JSON.stringify({ type: 'magiclink', token_hash: th }), hdr(anon, anon))
      const token = json(v)?.access_token
      if (!token) throw new Error(`verify failed: ${v.status} ${v.body}`)
      users[n].token = token
    }
  } catch (e) {
    cleanup(svc, users)
    throw e
  }
  return { runId, users }
}

function rpc(name, body, token, anon) {
  return http.post(`${BASE}/rest/v1/rpc/${name}`, JSON.stringify(body || {}), hdr(anon, token))
}

export default function (data) {
  const anon = __ENV.SUPABASE_ANON_KEY
  const { token, id } = data.users[exec.vu.idInTest - 1]
  const call = (name, body) => json(rpc(name, body, token, anon)) || {}

  // Double start race: one session, same session_id in both responses.
  const [a, b] = http.batch([
    ['POST', `${BASE}/rest/v1/rpc/start_session`, '{}', hdr(anon, token)],
    ['POST', `${BASE}/rest/v1/rpc/start_session`, '{}', hdr(anon, token)],
  ]).map(json)
  const codes = [a?.code, b?.code]
  const startOk = codes.every((c) => c === 'OK' || c === 'SESSION_ALREADY_EXISTS') &&
    codes.filter((c) => c === 'OK').length === 1 &&
    a?.data?.session_id && a.data.session_id === b?.data?.session_id
  if (!check(null, { 'double start: one session': () => startOk })) dupViolations.add(1)
  const sessionId = a?.data?.session_id
  let q = (a?.code === 'OK' ? a : b)?.data?.question

  let answered = 0
  for (let i = 1; i <= 12 && q; i++) {
    const body = { p_session_id: sessionId, p_question_id: q.question_id, p_option_id: q.options[0].id, p_idempotency_key: `${id}-${i}` }
    let res
    if (i === RACE_AT) {
      const [r1, r2] = http.batch([0, 1].map(() => ['POST', `${BASE}/rest/v1/rpc/submit_answer`, JSON.stringify(body), hdr(anon, token)])).map(json)
      const dupOk = r1?.ok && r2?.ok && r1.data.answer.answer_id === r2.data.answer.answer_id &&
        r1.data.answered_count === i && r2.data.answered_count === i
      if (!check(null, { 'duplicate submit: same answer, +1 only': () => dupOk })) dupViolations.add(1)
      res = r1
    } else {
      res = call('submit_answer', body)
      check(res, { 'submit_answer ok': (r) => r.ok === true && r.data.answered_count === i })
    }
    answered = res?.data?.answered_count ?? answered
    q = res?.data?.question
  }
  if (answered !== 12) lostAnswers.add(1)

  const r = call('get_result', { p_session_id: sessionId })
  check(r, { 'get_result ok': (x) => x.ok === true && x.data.status === 'COMPLETED' && x.data.answered_count === 12 })
}

export function teardown(data) {
  const svc = need('SUPABASE_STAGING_SERVICE_ROLE_KEY')
  const h = hdr(svc, svc)
  const problems = []
  try {
    for (const u of data.users) {
      const gs = json(http.get(`${BASE}/rest/v1/game_sessions?select=id&player_id=eq.${u.id}`, h)) || []
      const n = gs.length
        ? json(http.get(`${BASE}/rest/v1/answers?select=id&session_id=eq.${gs[0].id}`, h))?.length ?? -1
        : 0
      if (gs.length !== 1) problems.push(`player ${u.id}: ${gs.length} sessions (expected 1)`)
      if (n !== 12) problems.push(`player ${u.id}: ${n} answers in DB (expected 12)`)
    }
  } finally {
    cleanup(svc, data.users)
  }
  if (problems.length) {
    problems.forEach((p) => console.error(p))
    exec.test.fail(`DB verification failed:\n${problems.join('\n')}`)
  }
}
