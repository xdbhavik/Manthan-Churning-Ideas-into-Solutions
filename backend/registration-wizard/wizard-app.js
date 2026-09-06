/* ============================================================
 * SIH26043 Registration Wizard — app logic (vanilla JS, no build)
 * Drives: choose bucket/type → per-type details form → account &
 * documents → review → POST /registration (draft) → verify OTP →
 * submit → status timeline (with ACTION_REQUIRED edit/resubmit).
 * ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);

/* ---------------- persistent config / token ---------------- */
const state = {
  baseUrl: localStorage.getItem('sih_base') || 'http://localhost:8080',
  token: localStorage.getItem('sih_token') || '',
  refresh: localStorage.getItem('sih_refresh') || '',
  step: 0,
  bucket: null,        // selected bucket code
  type: null,          // selected subtype code
  data: {},            // collected per-type fields
  docs: [],            // array of {documentType, documentId}
  account: { phone: '', email: '' },
  regId: null,
  regStatus: null,
  lastOtp: null,       // challengeId + devOtp from create
  mode: 'create',      // 'create' | 'edit'
};

function save() { localStorage.setItem('sih_base', state.baseUrl); }
function saveToken() { localStorage.setItem('sih_token', state.token); }
function setTokens(access, refresh) {
  state.token = access || state.token;
  if (refresh) state.refresh = refresh;
  saveToken();
  renderRole();
}

/* ---------------- api helper (mirrors test-ui console) ---------------- */
async function api(method, path, { body, auth = false } = {}) {
  const url = state.baseUrl.replace(/\/+$/, '') + path;
  const headers = {};
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  if (auth && state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function showApi(containerId, label, res) {
  const el = $(containerId);
  el.hidden = false;
  el.innerHTML = `<pre><b>${label}</b>  → HTTP ${res.status} ${res.ok ? '✓' : '✗'}\n` +
    (typeof res.data === 'string' ? (res.data || '(empty body)') : JSON.stringify(res.data, null, 2)) + '</pre>';
}

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;right:16px;bottom:16px;background:#0b1116;border:1px solid ' +
    (kind === 'err' ? 'var(--err)' : 'var(--ok)') + ';color:var(--text);padding:10px 14px;border-radius:8px;' +
    'z-index:50;max-width:360px;font-size:13px';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

/* ---------------- rendering helpers ---------------- */
function humanize(s) {
  return (s || '').replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase());
}

function typeMeta() { return TYPES[state.type]; }

function renderRole() {
  $('roleBadge').textContent = state.token ? '🔑 authenticated' : 'not logged in';
  $('roleBadge').style.borderColor = state.token ? 'var(--ok)' : '';
}

function setStep(i) {
  state.step = i;
  document.querySelectorAll('#stepper li').forEach(li => {
    const s = +li.dataset.step;
    li.classList.toggle('active', s === i);
    li.classList.toggle('done', s < i);
  });
  document.querySelectorAll('.panel').forEach(p => p.hidden = true);
  $('panel-step' + i).hidden = false;
  if (i === 0) showStep0();
  if (i === 4) prepareSubmitPanel();
}

/* ---------------- STEP 0 : choose source ---------------- */
function showStep0() {
  const bl = $('bucketList'); bl.innerHTML = '';
  BUCKETS.forEach(b => {
    const c = document.createElement('button');
    c.className = 'b-card' + (state.bucket === b.code ? ' sel' : '');
    c.innerHTML = `<div class="ic">${b.icon}</div><div class="nm">${b.label}</div><div class="bl">${b.blurb}</div>`;
    c.onclick = () => { state.bucket = b.code; state.type = null; bl.querySelectorAll('.b-card').forEach(x => x.classList.remove('sel')); c.classList.add('sel'); renderTypes(); };
    bl.appendChild(c);
  });
  if (state.bucket) { bl.querySelectorAll('.b-card').forEach(x => x.classList.toggle('sel', false)); renderTypes(); }
}
function renderTypes() {
  const tl = $('typeList'); tl.hidden = false; tl.innerHTML = '';
  const list = BUCKETS.find(b => b.code === state.bucket);
  list.types.forEach(code => {
    const t = TYPES[code];
    const c = document.createElement('button');
    c.className = 't-card';
    c.innerHTML = `<div class="nm">${t.icon} ${t.name}</div><div class="tg">${t.tagline}</div>`;
    c.onclick = () => { state.type = code; enterDetails(); };
    tl.appendChild(c);
  });
}

/* ---------------- STEP 1 : per-type details form ---------------- */
function enterDetails() {
  const t = typeMeta();
  $('typeTitle').textContent = t.icon + ' ' + t.name;
  $('typeTag').textContent = t.tagline;
  buildDetailForm();
  setStep(1);
}

function fieldGroups() {
  // preserve order of first appearance across the fields array
  const order = [], map = {};
  typeMeta().fields.forEach(f => {
    if (!(f.group in map)) { map[f.group] = []; order.push(f.group); }
    map[f.group].push(f);
  });
  return order.map(g => ({ name: g, fields: map[g] }));
}

function buildDetailForm() {
  const form = $('detailForm'); form.innerHTML = '';
  fieldGroups().forEach(g => {
    const sec = document.createElement('div'); sec.className = 'group';
    sec.innerHTML = `<h4>${g.name}</h4>`;
    const grid = document.createElement('div'); grid.className = 'fgrid';
    g.fields.forEach(f => grid.appendChild(fieldEl(f)));
    sec.appendChild(grid); form.appendChild(sec);
  });
  document.querySelectorAll('#detailForm .fld input[data-num], #detailForm .fld input[type=number]')
    .forEach(i => { i.step = 'any'; });
}

function fieldEl(f) {
  const wrap = document.createElement('div');
  wrap.className = 'fld' + (f.type === 'textarea' ? ' full' : '');
  const id = 'fld-' + f.key;
  const cur = state.data[f.key];
  let input;
  const lbl = `<label for="${id}">${f.label}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
  const hint = f.hint ? `<div class="hint">${f.hint}</div>` : '';

  if (f.type === 'select') {
    input = `<select id="${id}"><option value="">— select —</option>` +
      f.options.map(o => `<option value="${o}"${String(o) === String(cur) ? ' selected' : ''}>${humanize(o)}</option>`).join('') + '</select>';
  } else if (f.type === 'boolean') {
    input = `<input type="checkbox" id="${id}"${cur ? ' checked' : ''} style="width:auto;height:auto">`;
    wrap.classList.add('check-inline');
  } else {
    const attrs = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
    const type = { textarea: '', number: 'number', money: 'number', date: 'date', email: 'email', url: 'url' }[f.type] || 'text';
    const val = cur != null ? ` value="${String(cur).replace(/"/g, '&quot;')}"` : '';
    if (f.type === 'textarea') {
      input = `<textarea id="${id}" rows="${f.rows || 3}">${cur != null ? String(cur) : ''}</textarea>`;
    } else {
      input = `<input type="${type}" id="${id}"${attrs}${val} step="${type === 'number' ? 'any' : ''}">`;
    }
  }
  wrap.innerHTML = lbl + input + `<div class="err-msg" id="err-${id}"></div>` + hint;
  return wrap;
}

function collectForm() {
  state.data = {};
  typeMeta().fields.forEach(f => {
    const el = $('fld-' + f.key); if (!el) return;
    let v;
    if (f.type === 'boolean') v = el.checked;
    else if (f.type === 'textarea') v = el.value.trim();
    else if (f.type === 'number' || f.type === 'money') v = el.value.trim() === '' ? null : Number(el.value);
    else v = el.value.trim();
    // select holding literal true/false (maps to a Boolean column)
    if (f.type === 'select' && (v === 'true' || v === 'false')) v = v === 'true';
    state.data[f.key] = v;
  });
}

function validateForm() {
  let ok = true, firstBad = null;
  typeMeta().fields.forEach(f => {
    const el = $('fld-' + f.key); if (!el) return;
    const err = $('err-fld-' + f.key);
    const v = state.data[f.key];
    const bad = f.required && (v === '' || v === null || v === undefined || (f.type === 'select' && v === ''));
    if (err) err.textContent = bad ? 'This field is required to submit' : '';
    el.classList.toggle('invalid', !!bad);
    if (bad) { ok = false; firstBad = firstBad || el; }
  });
  return { ok, firstBad };
}

/* ---------------- STEP 2 : account + documents ---------------- */
function ensureDocs() {
  const wrap = $('docRows'); wrap.innerHTML = '';
  const examples = ['AUTHORIZATION_LETTER', 'REGISTRATION_CERTIFICATE', 'GOVT_ID', 'INCORPORATION_CERT', 'BANK_STATEMENT', 'OTHER'];
  if (!state.docs.length) state.docs.push({ documentType: '', documentId: '' });
  state.docs.forEach((d, i) => {
    const r = document.createElement('div'); r.className = 'doc-row';
    r.innerHTML =
      `<select data-i="${i}"><option value="">Type…</option>` +
      examples.map(o => `<option value="${o}"${d.documentType === o ? ' selected' : ''}>${humanize(o)}</option>`).join('') +
      `</select>` +
      `<input data-i="${i}" class="doc-id" placeholder="document number / URL" value="${d.documentId || ''}">` +
      `<button class="btn" data-i="${i}" data-rm="1">✕</button>`;
    wrap.appendChild(r);
  });
  wrap.querySelectorAll('select').forEach(s => s.onchange = () => { state.docs[s.dataset.i].documentType = s.value; });
  wrap.querySelectorAll('.doc-id').forEach(inp => inp.oninput = () => { state.docs[inp.dataset.i].documentId = inp.value; });
  wrap.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { state.docs.splice(b.dataset.i, 1); ensureDocs(); });
}
function syncDocs() {
  state.docs = state.docs.filter(d => d.documentType || d.documentId);
  return state.docs;
}

/* ---------------- STEP 3 : review & create ---------------- */
function buildReview() {
  const out = $('reviewOut'); out.innerHTML = '';
  const t = typeMeta();
  const add = (title, rows) => {
    if (!rows.length) return;
    const g = document.createElement('div'); g.className = 'rv-group';
    g.innerHTML = `<h4>${title}</h4><dl class="kv">` +
      rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('') + '</dl>';
    out.appendChild(g);
  };
  const fmt = (v) => v === null || v === undefined || v === '' ? '<span class="missing">—</span>' :
    (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v));
  const rows = typeMeta().fields.filter(f => state.data[f.key] !== null && state.data[f.key] !== undefined && state.data[f.key] !== '')
    .map(f => [f.label, fmt(state.data[f.key])]);
  add(`${t.icon} ${t.name} — details`, rows);
  add('Account', [['Phone', state.account.phone], ['Email', state.account.email || '—']]);
  add('Documents', state.docs.map(d => [`${d.documentType || 'doc'}`, d.documentId]));
}
async function doCreate() {
  const body = {
    sourceType: state.type,
    account: { phone: state.account.phone, email: state.account.email || null },
    source: Object.fromEntries(Object.entries(state.data).filter(([, v]) => v !== null && v !== '' && v !== undefined)),
    documents: syncDocs().length ? syncDocs() : undefined,
  };
  const btn = $('btnCreate'); btn.disabled = true;
  const res = await api('POST', '/registration', { body });
  btn.disabled = false;
  showApi('apiOut', 'POST /registration', res);
  if (res.ok) {
    state.regId = res.data.registrationId;
    state.regStatus = 'DRAFT';
    toast('Draft created ✓ — issuing login OTP');
    await prepOtp();
    setStep(4);
  } else {
    toast('Create failed — see response below', 'err');
  }
}

/**
 * The create response carries no OTP challenge — the backend issues one
 * inside create() and discards it. The challenge the applicant must verify
 * comes from POST /auth/login (create already made the user). Auto-issue it
 * here and surface devOtp for the dev/sandbox flow.
 */
async function prepOtp() {
  const hint = $('otpHint');
  hint.textContent = 'Requesting a login OTP for ' + state.account.phone + '…';
  const res = await api('POST', '/auth/login', { body: { phone: state.account.phone } });
  showApi('apiOut2', 'POST /auth/login', res);
  if (res.ok && res.data.challengeId) {
    state.lastOtp = res.data;
    $('otpChallenge').value = res.data.challengeId;
    $('otpCode').value = res.data.devOtp || '';
    hint.innerHTML = res.data.devOtp
      ? `Dev mode: mock OTP is <b>${res.data.devOtp}</b> — auto-filled below.`
      : 'OTP sent by SMS (prod). Enter the code you received.';
  } else if (res.status === 404) {
    // user not found (create did not persist?) → fall back to register
    hint.textContent = 'Phone not registered — re-issuing via /auth/register.';
    const r2 = await api('POST', '/auth/register', { body: { phone: state.account.phone } });
    showApi('apiOut2', 'POST /auth/register', r2);
    if (r2.ok && r2.data.challengeId) {
      state.lastOtp = r2.data;
      $('otpChallenge').value = r2.data.challengeId;
      $('otpCode').value = r2.data.devOtp || '';
      hint.innerHTML = r2.data.devOtp
        ? `Dev mode: mock OTP is <b>${r2.data.devOtp}</b> — auto-filled below.`
        : 'OTP sent by SMS (prod). Enter the code you received.';
    } else {
      hint.textContent = 'Could not obtain an OTP challenge — see response below.';
    }
  } else {
    hint.textContent = 'Could not obtain an OTP challenge — see response below.';
  }
}

/* ---------------- STEP 4 : verify + submit ---------------- */
function prepareSubmitPanel() {
  $('submitCard').hidden = !state.token || !state.regId;
  if (state.regId) $('regLine').textContent = 'Registration ' + state.regId + ' · status ' + (state.regStatus || '?');
}
async function doVerify() {
  const body = { challengeId: $('otpChallenge').value.trim(), code: $('otpCode').value.trim() };
  const btn = $('btnVerify'); btn.disabled = true;
  const res = await api('POST', '/auth/verify-otp', { body });
  btn.disabled = false;
  showApi('apiOut2', 'POST /auth/verify-otp', res);
  if (res.ok) {
    setTokens(res.data.accessToken, res.data.refreshToken);
    toast('Verified ✓ — logged in as registration owner');
    $('submitCard').hidden = false;
    $('regLine').textContent = 'Registration ' + state.regId + ' · status DRAFT';
  } else toast('Verify failed — see response', 'err');
}
async function doSubmit() {
  const btn = $('btnSubmit'); btn.disabled = true;
  const res = await api('POST', `/registration/${state.regId}/submit`, { auth: true });
  btn.disabled = false;
  showApi('apiOut2', `POST /registration/${state.regId}/submit`, res);
  if (res.ok) {
    state.regStatus = res.data.status;
    toast('Submitted ✓ — now under review');
    renderStatus();
  } else if (res.status === 400 || res.status === 409) {
    toast('Submit rejected — ' + (res.data && res.data.detail ? res.data.detail : 'see response'), 'err');
    // surface which required field is missing
    if (res.data && res.data.detail) $('otpHint').textContent = res.data.detail;
  }
}

/* ---------------- STATUS TIMELINE ---------------- */
async function renderStatus() {
  setStep(-1); // hide numbered panels, show status panel
  document.querySelectorAll('.panel').forEach(p => p.hidden = true);
  $('panel-status').hidden = false;
  const sc = $('statusCard'); sc.innerHTML = '<p class="mini">Loading status…</p>';
  const [st, hist] = await Promise.all([
    api('GET', `/registration/${state.regId}/status`, { auth: false }),
    api('GET', `/registration/${state.regId}/history`, { auth: true }),
  ]);
  const status = (st.ok && st.data) ? st.data : null;
  state.regStatus = status ? status.status : state.regStatus;
  let html = '';
  const flag = status ? `<span class="flag ${status.status}">${status.status}</span>` : '';
  html += `<div class="status-banner ${status && (status.status === 'APPROVED' ? 'ok' : status.status === 'REJECTED' ? 'warn' : '')}">
    <b>${state.type ? (typeMeta().icon + ' ' + typeMeta().name) : 'Registration'}</b> — current status ${flag || '—'}</div>`;
  if (status && status.comment) html += `<div class="mini">Reviewer note: ${status.comment}</div>`;

  if (hist.ok && Array.isArray(hist.data) && hist.data.length) {
    html += '<div class="tl">' + hist.data.slice().reverse().map((h, idx) =>
      `<div class="tl-item"><span class="dot${idx === 0 ? ' now' : ''}"></span>
        <div class="tl-body"><div class="s">${h.toStatus}</div>
        <div class="c">${h.comment ? h.comment + ' · ' : ''}${h.changedAt ? h.changedAt.replace('T', ' ').slice(0, 16) : ''}</div>
        </div></div>`).join('') + '</div>';
  }
  // editable states → offer edit & resubmit
  const editable = status && ['DRAFT', 'ACTION_REQUIRED'].includes(status.status);
  if (editable) {
    html += `<div class="btnrow"><button class="btn primary" id="btnEditResub">Edit details &amp; resubmit</button></div>`;
  }
  sc.innerHTML = html;
  if (editable) $('btnEditResub').onclick = () => startEdit();
  if (hist.ok === false) showApi('apiOut', 'status/history', hist);
}

async function startEdit() {
  const res = await api('GET', `/registration/${state.regId}`, { auth: true });
  if (!res.ok) { toast('Could not load registration for edit', 'err'); return; }
  state.mode = 'edit';
  state.data = res.data.source || {};
  enterDetails(); // step 1 with loaded data
  toast('Editing draft — change details, then review');
  // hook: step3 button becomes update
}

function hookButtons() {
  $('btnBase').onclick = () => { state.baseUrl = $('baseUrl').value.trim() || state.baseUrl; $('baseUrl').value = state.baseUrl; save(); toast('Base URL saved'); };
  $('btnToAccount').onclick = () => {
    collectForm();
    const v = validateForm();
    if (!v.ok) { toast('Some required fields are missing (highlighted)', 'err'); return; }
    $('acctPhone').value = state.account.phone; $('acctEmail').value = state.account.email;
    setStep(2);
  };
  $('btnToReview').onclick = () => {
    const phone = $('acctPhone').value.trim();
    if (!/^[0-9]{10}$/.test(phone)) { toast('Phone must be exactly 10 digits', 'err'); return; }
    state.account = { phone, email: $('acctEmail').value.trim() };
    syncDocs();
    buildReview();
    const btn = $('btnCreate');
    btn.textContent = state.mode === 'edit' && state.regId ? 'Update draft' : 'Create registration (draft)';
    btn.onclick = state.mode === 'edit' && state.regId ? doUpdate : doCreate;
    setStep(3);
  };
  $('btnAddDoc').onclick = () => { state.docs.push({ documentType: '', documentId: '' }); ensureDocs(); };
  $('btnVerify').onclick = doVerify;
  $('btnSubmit').onclick = doSubmit;
  $('btnRefreshStatus').onclick = renderStatus;
  $('btnReset').onclick = () => location.reload();
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { collectForm(); setStep(+b.dataset.go); });
  // stepper nav limited
}

async function doUpdate() {
  const btn = $('btnCreate'); btn.disabled = true;
  const source = Object.fromEntries(Object.entries(state.data).filter(([, v]) => v !== null && v !== '' && v !== undefined));
  const res = await api('PATCH', `/registration/${state.regId}`, { body: { source }, auth: true });
  btn.disabled = false;
  showApi('apiOut', `PATCH /registration/${state.regId}`, res);
  if (res.ok) { toast('Draft updated ✓'); setStep(4); }
  else toast('Update failed — see response', 'err');
}

/* ---------------- init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  $('baseUrl').value = state.baseUrl;
  hookButtons();
  renderRole();
  ensureDocs();
  setStep(0);
  document.querySelectorAll('#stepper li').forEach(li => li.onclick = () => {
    const s = +li.dataset.step;
    // allow going back freely; forward only to a completed/valid step
    if (s < state.step || (state.type && s === 1)) setStep(s);
  });
});
