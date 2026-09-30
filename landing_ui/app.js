const portalDefinitions = [
  {
    id: "innovation",
    title: "Innovation Portal",
    role: "Innovators and institutions",
    description: "Explore national challenges, discover published problems, and build a solution dossier.",
    port: 3004,
    tone: "featured",
  },
  {
    id: "reviewer",
    title: "Reviewer Workbench",
    role: "Statutory reviewers",
    description: "Verify problem statements, resolve compliance questions, and record review decisions.",
    port: 8086,
    tone: "review",
  },
  {
    id: "evaluator",
    title: "Evaluator Suite",
    role: "Technical evaluators",
    description: "Assess submissions with structured rubrics and maintain continuity of expertise.",
    port: 3001,
    tone: "evaluate",
  },
  {
    id: "submitter",
    title: "Submitter Hub",
    role: "Problem sources",
    description: "Draft challenge statements, attach supporting evidence, and track submitted problems.",
    port: 5174,
    tone: "submit",
  },
  {
    id: "admin",
    title: "Admin Console",
    role: "Platform administrators",
    description: "Coordinate registrations, manage platform access, and monitor operational activity.",
    port: 5173,
    tone: "admin",
  },
];

const storageKey = "sih26043.portalUrls";
const grid = document.querySelector("#workspace-grid");
const dialog = document.querySelector("#link-dialog");
const fields = document.querySelector("#link-fields");
const form = document.querySelector("#link-form");
const toast = document.querySelector("#toast");
let toastTimer;

function currentHost() {
  return window.location.hostname || "localhost";
}

function defaultUrl(port) {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${currentHost()}:${port}/`;
}

function readOverrides() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function portalUrl(portal, overrides = readOverrides()) {
  return overrides[portal.id] || defaultUrl(portal.port);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function displayAddress(value) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

function renderPortals() {
  const overrides = readOverrides();
  grid.innerHTML = portalDefinitions.map((portal, index) => {
    const url = portalUrl(portal, overrides);
    return `
      <a class="portal-card portal-card--${portal.tone}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="--delay:${index * 55}ms">
        <div class="card-topline">
          <span class="card-role">${escapeHtml(portal.role)}</span>
          <span class="card-number">0${index + 1}</span>
        </div>
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(portal.title)}</h3>
          <span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 15 15 5M6 5h9v9" /></svg></span>
        </div>
        <p class="card-description">${escapeHtml(portal.description)}</p>
        <div class="card-bottom">
          <span class="card-url">${escapeHtml(displayAddress(url))}</span>
          <span class="card-open">Open workspace</span>
        </div>
      </a>
    `;
  }).join("");
  document.querySelector("#portal-count").textContent = String(portalDefinitions.length).padStart(2, "0");
  document.querySelector("#gateway-address").textContent = `${currentHost()}:8090`;
  document.querySelector("#registry-address").textContent = `${currentHost()}:8761`;
}

function renderSettings() {
  const overrides = readOverrides();
  fields.innerHTML = portalDefinitions.map((portal) => `
    <div class="link-field">
      <label for="portal-${portal.id}">${escapeHtml(portal.title)} <span>default :${portal.port}</span></label>
      <input id="portal-${portal.id}" name="${portal.id}" type="url" value="${escapeHtml(portalUrl(portal, overrides))}" required />
    </div>
  `).join("");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

document.querySelector("#open-settings").addEventListener("click", () => {
  renderSettings();
  dialog.showModal();
});

document.querySelector("#close-settings").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-settings").addEventListener("click", () => dialog.close());

document.querySelector("#reset-links").addEventListener("click", () => {
  window.localStorage.removeItem(storageKey);
  renderSettings();
  renderPortals();
  showToast("Portal links restored to local defaults.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const overrides = Object.fromEntries(portalDefinitions.map((portal) => [portal.id, values.get(portal.id).trim()]));
  window.localStorage.setItem(storageKey, JSON.stringify(overrides));
  renderPortals();
  dialog.close();
  showToast("Portal links saved in this browser.");
});

renderPortals();