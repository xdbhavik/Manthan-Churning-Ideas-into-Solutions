# Stitch Prompt — SIH26043 Reviewer Panel

Design a reviewer triage/decision web app UI: global nav + a queue dashboard + a split-screen detail view for making decisions on registrations. Institutional, task-queue aesthetic (case-management tool, not a consumer app). Do not add screens, fields, tabs, or workflow states beyond what's listed below, and do not change which statuses enable which actions.

---

## Screen 1 — Login (OTP)
- Field: Mobile Number input
- Button: request OTP
- (Same OTP-based flow as Submitters — role, not screen design, is what differs)

## Screen 2 — OTP Verification
- 6-digit OTP input
- Button: "Verify & Continue"
- On success, role is checked (decoded from JWT / fetched profile): if `REVIEWER` role is not present, redirect to an **Access Denied** page instead of the dashboard

## Screen 3 — Access Denied Page
- Simple access-denied state for a non-Reviewer account

---

## Global Navigation (persistent across all screens below)
- Nav links: "Registration Queue", "Problem Queue", "My Reviews", "Logout"
- "Problem Queue" is a placeholder/coming-soon nav destination — future problem-verification workflow (`SOURCE_VERIFYING` → `SOURCE_VERIFIED` → `REGISTERED`) is not yet specified in detail, so design it as a stub page rather than inventing full functionality for it

---

## Screen 4 — Registration Queue Dashboard
Kanban-style board or filterable data table.
- **Tabs/Pills:**
  - "Inbox" (default) — shows `SUBMITTED` and `ACTION_REQUIRED` registrations
  - "My Reviews" — shows `UNDER_REVIEW` registrations assigned to the current reviewer
  - "History" — shows `APPROVED` and `REJECTED` registrations
- **Data Table Columns:** Org Name, Entity Type, Submitted Date, Current Status, Action
- Reviewers can also filter by any specific status (including `DRAFT`), but `DRAFT` rows must be strictly read-only — no action buttons/links on them, since the submitter hasn't finished the registration yet
- On a `SUBMITTED` row, show an "Assign to Me" (a.k.a. "Start Review") button/action — clicking it claims the registration, moving it to `UNDER_REVIEW` and into that reviewer's "My Reviews" tab

---

## Screen 5 — Registration Detail View
Split-screen layout, reached by opening a queue row (only meaningfully actionable once the registration is `UNDER_REVIEW`).
- **Left pane:** read-only display of the submitted registration's fields (e.g. `priName`, `sarpanchName`, `organizationName`, and the rest of the submitted data) — presented as a structured read-only record, not an editable form
- **Right pane — Decision Module:**
  - Three action buttons: "Approve ✅", "Request Action ↩️", "Reject ❌"
  - A Comment textarea below the buttons
  - Comment is optional for Approve, but becomes **required** — with the submit button disabled until filled — the moment "Reject" or "Request Action" is selected
  - Approve → registration becomes `APPROVED` (submitter's KYC becomes `VERIFIED`, a SourceAccount is provisioned)
  - Request Action → registration becomes `ACTION_REQUIRED` (returns control to the submitter to edit and resubmit)
  - Reject → registration becomes `REJECTED` (terminal state)

---

Design all screens as one consistent design system (same header/nav shell, typography, tab and button styles, status badge colors across every screen). Keep the visual language institutional and functional — a triage/case-queue tool, not a consumer app.
