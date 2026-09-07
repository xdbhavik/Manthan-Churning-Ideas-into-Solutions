/* ============================================================
 * SIH26043 actor-ui — SHARED ENGINE (loaded by all 4 actor pages)
 *
 * Every actor (SUBMITTER / REVIEWER / ADMIN / EVALUATOR) keeps its OWN token in
 * localStorage, keyed by actor, so switching persona never mixes JWTs.
 * This file provides: state + token mgmt, api()/show(), OTP auth flow,
 * persona nav, and a generic Raw request card. Actor-specific endpoint
 * functions live in each page's inline <script>.
 * ============================================================ */
'use strict';
const $ = id => document.getElementById(id);

const ACTOR = (document.body && document.body.dataset.actor) || 'SUBMITTER';
const ACTOR_LABEL = { SUBMITTER: 'Submitter', REVIEWER: 'Reviewer', ADMIN: 'Admin',
                      EVALUATOR: 'Evaluator' }[ACTOR];

/* ---- per-actor local keys ---- */
function k(suffix) { return 'sih_' + ACTOR.toLowerCase() + '_' + suffix; }
const state = {
  baseUrl: localStorage.getItem('sih_base_url') || 'http://localhost:8080',
  token:   localStorage.getItem(k('token')) || '',
  refresh: localStorage.getItem(k('refresh')) || '',
  user: null, lastOtp: null, sourceTypes: []
};

function saveBase(){ state.baseUrl = $('baseUrl').value.trim(); localStorage.setItem('sih_base_url', state.baseUrl); flash('Base URL saved'); }
function saveToken(){ state.token = $('token').value.trim(); persist(); flash('Token saved'); renderUser(); }
function persist(){
  localStorage.setItem(k('token'), state.token);
  if (state.refresh) localStorage.setItem(k('refresh'), state.refresh);
}
function clearTokens(){
  state.token=''; state.refresh=''; state.user=null;
  localStorage.removeItem(k('token')); localStorage.removeItem(k('refresh'));
  ['token','aRefresh'].forEach(i=>{ const e=$(i); if(e) e.value=''; });
  renderUser(); flash('Tokens cleared');
}
function setTokens(access, refresh, user){
  state.token = access || state.token;
  if (refresh){ state.refresh = refresh; const e=$('aRefresh'); if(e) e.value=refresh; }
  if (user) state.user = user;
  const t=$('token'); if(t) t.value = state.token;
  persist(); renderUser();
}
function renderUser(){
  const b = $('roleBadge'); if(!b) return;
  const roleOK = state.user && state.user.role === ACTOR;
  b.textContent = state.user
    ? `${state.user.role}${roleOK?'':' ⚠ wrong-actor!'} · KYC ${state.user.kycStatus||'?'}` + (state.user.linkedSourceId?' · linked':'')
    : state.token ? 'authenticated (role unknown)' : `${ACTOR_LABEL} · not logged in`;
  b.style.borderColor = state.token ? 'var(--ok)' : '';
  const note = $('roleNote');
  if (note){
    note.className = 'role-note ' + (state.user ? (roleOK ? 'role-ok' : 'role-wrong') : '');
    if (state.user && roleOK)  note.innerHTML = `✓ Logged in as <b>${ACTOR_LABEL}</b> (${state.user.role}). Ye page sirf ${ACTOR_LABEL} ke ops dikhata hai.`;
    else if (state.user)       note.innerHTML = `⚠ Ye page <b>${ACTOR_LABEL}</b> ke liye hai, par login role <b>${state.user.role}</b> hai. Sahi actor ka login karo (right-top token bar / Auth card).`;
    else                       note.innerHTML = ACTOR === 'SUBMITTER'
      ? 'Submiter: register/login karo, verify-otp se token lo — phir neeche kaam karo.'
      : `${ACTOR_LABEL}: role DB se set hota hai, phir login karo. Phone sahi ho to Auth card bharo.`;
  }
}

/* ---- api helper ---- */
async function api(method, path, { body, formData, auth = true } = {}) {
  const url = state.baseUrl.replace(/\/+$/, '') + path;
  const headers = {};
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  if (auth && state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}
function show(req, res){
  const r=$('outReq'); if(r) r.textContent = req;
  const st=$('outStatus');
  if(st){ st.textContent='HTTP '+res.status+(res.ok?' ✓':' ✗'); st.style.borderColor=res.ok?'var(--ok)':'var(--err)'; st.style.color=res.ok?'var(--ok)':'var(--err)'; }
  const o=$('out'); if(o) o.textContent = typeof res.data==='string' ? (res.data||'(empty body)') : JSON.stringify(res.data,null,2);
}
function flash(msg){ const r=$('outReq'); if(r) r.textContent=msg; }
function jsonParse(text, fb){ try { return JSON.parse(text); } catch { if(fb!==undefined) return fb; throw new Error('Invalid JSON:\n'+text); } }

/* ---- persona nav ---- */
function wirePersonas(){
  document.querySelectorAll('nav.personas a').forEach(a=>{
    if (a.dataset.actor === ACTOR) a.classList.add('active');
  });
}
/* ---- generic raw request (every page keeps it) ---- */
async function rawSend(){
  const method = $('rawMethod').value;
  const path = $('rawPath').value.trim();
  if (!path){ flash('Path required'); return; }
  const txt = $('rawBody').value.trim();
  const body = (method==='GET'||method==='DELETE'||!txt) ? undefined : jsonParse(txt);
  show(method+' '+path, await api(method,path,{body}));
}

/* ---- OTP auth (shared across actors; token stored per-actor) ---- */
async function auth(kind){
  const phone = $('aPhone').value.trim();
  if (!/^[0-9]{10}$/.test(phone)){ flash('Phone must be 10 digits'); return; }
  const body = { phone };
  if ($('aEmail').value.trim()) body.email = $('aEmail').value.trim();
  const res = await api('POST', '/auth/'+kind, { body, auth:false });
  show('POST /auth/'+kind, res);
  if (res.ok && res.data.challengeId){ state.lastOtp = res.data; flash(`OTP issued. devOtp = ${res.data.devOtp||'(none)'} → "Use devOtp"`); }
}
function useDevOtp(){
  if (!state.lastOtp){ flash('Pehle register/login karo'); return; }
  $('aChallenge').value = state.lastOtp.challengeId;
  $('aCode').value = state.lastOtp.devOtp || '';
  flash('OTP form filled from last response');
}
async function verifyOtp(){
  const body = { challengeId: $('aChallenge').value.trim(), code: $('aCode').value.trim() };
  const res = await api('POST', '/auth/verify-otp', { body, auth:false });
  show('POST /auth/verify-otp', res);
  if (res.ok) setTokens(res.data.accessToken, res.data.refreshToken, res.data.user);
}
async function refreshTok(){
  const body = { refreshToken: $('aRefresh').value.trim() };
  const res = await api('POST', '/auth/refresh', { body, auth:false });
  show('POST /auth/refresh', res);
  if (res.ok) setTokens(res.data.accessToken, res.data.refreshToken);
}
async function logout(){
  const body = { refreshToken: $('aRefresh').value.trim() };
  show('POST /auth/logout', await api('POST', '/auth/logout', { body, auth:false }));
}

/* ---- init ---- */
document.addEventListener('DOMContentLoaded', () => {
  if ($('baseUrl')) $('baseUrl').value = state.baseUrl;
  if ($('token')) $('token').value = state.token;
  if (state.refresh && $('aRefresh')) $('aRefresh').value = state.refresh;
  wirePersonas();
  renderUser();
});
