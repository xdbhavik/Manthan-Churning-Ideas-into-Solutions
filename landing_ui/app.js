const portalDefinitions = [
  {
    id: "submitter",
    title: "Submitter Hub",
    role: "Problem sources",
    description: "Draft challenge statements, attach supporting evidence, and track submitted problems.",
    port: 5174,
    tone: "submit",
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
    id: "innovation",
    title: "Innovation Portal",
    role: "Innovators and institutions",
    description: "Explore national challenges, discover published problems, and build a solution dossier.",
    port: 3004,
    tone: "featured",
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

const grid = document.querySelector("#workspace-grid");

function currentHost() {
  return window.location.hostname || "localhost";
}

function defaultUrl(port) {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${currentHost()}:${port}/`;
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

function renderPortals() {
  grid.innerHTML = portalDefinitions.map((portal, index) => {
    const url = defaultUrl(portal.port);
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
          <span class="card-open">Open workspace</span>
        </div>
      </a>
    `;
  }).join("");
  document.querySelector("#portal-count").textContent = String(portalDefinitions.length).padStart(2, "0");
}

renderPortals();