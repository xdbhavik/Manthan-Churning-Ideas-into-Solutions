# 🚀 Vercel Deployment Guide for SIH26043 Frontends

All 5 frontends in this repository can be deployed to **Vercel** with **zero modifications** needed. The AWS backend is already live at `https://api.bhavik.site` with valid Let's Encrypt TLS and fully permissive CORS preflight policies.

---

## 🌐 Live Production Deployments

All 5 frontends have been deployed to Vercel as **independent projects** connected to the AWS production backend at `https://api.bhavik.site`:

| Portal | Role / Target Audience | Live Production URL | Vercel Project |
| :--- | :--- | :--- | :--- |
| 🇮🇳 **National Innovation Portal** | Public Innovators & Students | [https://innovation-portal-web.vercel.app](https://innovation-portal-web.vercel.app) | `innovation-portal-web` |
| 🎯 **Evaluator Interface** | Domain Experts & Evaluators | [https://evaluator-ui-kappa.vercel.app](https://evaluator-ui-kappa.vercel.app) | `evaluator-ui` |
| 📝 **Submitter Interface** | Solution Submissions & KYC | [https://submitter-ui.vercel.app](https://submitter-ui.vercel.app) | `submitter-ui` |
| 🛡️ **Admin Portal** | System & Cycle Administration | [https://admin-ui-ivory-alpha.vercel.app](https://admin-ui-ivory-alpha.vercel.app) | `admin-ui` |
| ⚖️ **Reviewer Workbench** | Statutory & Source Reviewers | [https://reviewer-ui-two.vercel.app](https://reviewer-ui-two.vercel.app) | `reviewer-ui` |

---

## ⚡ Deployment Matrix

Because this repository is structured as a monorepo, each portal is an independent project linked to its respective subfolder:

| Portal | Project Name | Root Directory | Framework Preset | Build Command | Output Directory | Environment Variables |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **National Innovation Portal** | `innovation-portal-web` | `frontend/innovation-portal-web` | **Vite** | `npm run build` | `dist` | `VITE_API_BASE_URL=https://api.bhavik.site` |
| **Evaluator Interface** | `evaluator-ui` | `frontend/evaluator-ui` | **Vite** | `npm run build` | `dist` | `VITE_API_BASE_URL=https://api.bhavik.site` |
| **Submitter Interface** | `submitter-ui` | `frontend/submitter-ui` | **Vite** | `npm run build` | `dist` | `VITE_API_BASE_URL=https://api.bhavik.site` |
| **Admin Portal** | `admin-ui` | `frontend/admin-ui` | **Other** | *(none)* | `.` | *(none needed)* |
| **Reviewer Workbench** | `reviewer-ui` | `frontend/reviewer-ui` | **Other** | *(none)* | `.` | *(none needed)* |

---

## 🛠️ Step-by-Step Vercel Setup

### 1. Connect GitHub Repository
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your GitHub repository: `Manthan-Churning-Ideas-into-Solutions`.

---

### 2. Configure Each Project

#### A. National Innovation Portal (`frontend/innovation-portal-web`)
- **Project Name:** `sih-innovation-portal`
- **Root Directory:** Click **Edit** and choose `frontend/innovation-portal-web`.
- **Framework Preset:** Vite (automatically detected).
- **Build & Output Settings:**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- **Environment Variables:**
  - Key: `VITE_API_BASE_URL`
  - Value: `https://api.bhavik.site`
- Click **Deploy**.

#### B. Evaluator Interface (`frontend/evaluator-ui`)
- **Project Name:** `sih-evaluator-ui`
- **Root Directory:** Click **Edit** and choose `frontend/evaluator-ui`.
- **Framework Preset:** Vite (automatically detected).
- **Build & Output Settings:**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- **Environment Variables:**
  - Key: `VITE_API_BASE_URL`
  - Value: `https://api.bhavik.site`
- Click **Deploy**.

#### C. Submitter Interface (`frontend/submitter-ui`)
- **Project Name:** `sih-submitter-ui`
- **Root Directory:** Click **Edit** and choose `frontend/submitter-ui`.
- **Framework Preset:** Vite (automatically detected).
- **Build & Output Settings:**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- **Environment Variables:**
  - Key: `VITE_API_BASE_URL`
  - Value: `https://api.bhavik.site`
- Click **Deploy**.

#### D. Admin Portal (`frontend/admin-ui`)
- **Project Name:** `sih-admin-ui`
- **Root Directory:** Click **Edit** and choose `frontend/admin-ui`.
- **Framework Preset:** **Other** (Static HTML/JS).
- **Build & Output Settings:**
  - Build Command: **Override** and toggle **OFF** (leave empty).
  - Output Directory: **Override** and set to `.`
- **Environment Variables:** None required.
- Click **Deploy**.

#### E. Reviewer Workbench (`frontend/reviewer-ui`)
- **Project Name:** `sih-reviewer-ui`
- **Root Directory:** Click **Edit** and choose `frontend/reviewer-ui`.
- **Framework Preset:** **Other** (Static HTML/JS).
- **Build & Output Settings:**
  - Build Command: **Override** and toggle **OFF** (leave empty).
  - Output Directory: **Override** and set to `.`
- **Environment Variables:** None required.
- Click **Deploy**.

---

## 🔒 Verification & Compatibility Notes

1. **SPA Deep-Linking & Page Reloads (`vercel.json`)**:
   - Every frontend folder now includes a pre-configured `vercel.json` with client-side rewrites (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`).
   - Deep links (such as `/problems/SIH26043-001`, `/cycle/1`, or direct refreshes) will correctly load without HTTP 404.

2. **CORS (Cross-Origin Resource Sharing)**:
   - Live verified against AWS production backend (`https://api.bhavik.site`).
   - Preflight `OPTIONS` requests from any `*.vercel.app` domain return:
     ```http
     HTTP/1.1 200 OK
     Access-Control-Allow-Origin: https://<your-vercel-domain>.vercel.app
     Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
     Access-Control-Allow-Headers: *
     ```

3. **HTTPS / Mixed-Content Free**:
   - Both Vercel frontends (`https://`) and the AWS backend gateway (`https://api.bhavik.site`) use SSL/TLS, preventing modern browser mixed-content blocks.
