# Prompt: Implement Reviewer Service Frontend

## Context
This project already has a `frontend` folder containing an `evaluator ui` subfolder — the screen designs for the Reviewer service, imported from Stitch (Google AI Studio). "Evaluator" and "Reviewer" refer to the same service; the folder is just named differently from the export tool.

There is also a separate, more complete prototype of this same service at:
`C:\Users\ppran\OneDrive\Desktop\reviewer service`
This prototype was generated in Google AI Studio and is more fully built out than the raw Stitch screens. **Treat it as the primary visual and structural reference.**

## Objective
Implement the Reviewer service frontend inside the existing `frontend/evaluator ui` folder, using:
1. **`reviewer service` prototype** (Google AI Studio) — source of truth for visual design, layout, component structure, theming, and animations/transitions.
2. **`reviewer_frontend_specification.md`** — source of truth for all business logic, API contracts, state transitions, and workflow rules.

## Requirements

### 1. Design fidelity
- Reproduce the prototype as-is: layout, spacing, color theme, typography, component structure, and all animations/transitions.
- Where the Stitch-exported screens in `evaluator ui` differ from the prototype, the prototype wins — reconcile the Stitch screens toward it rather than the other way around.
- Do not redesign, simplify, or restyle anything unless it's genuinely broken or unimplementable as shown.

### 2. Logic — driven entirely by `reviewer_frontend_specification.md`
Implement, in full:
- **Auth flow**: OTP login/verify, JWT + refresh token storage, `REVIEWER` role check with redirect to an Access Denied state if the role check fails.
- **Registration Queue (Dashboard)**: `GET /reviewer/registrations` default view (SUBMITTED, UNDER_REVIEW, ACTION_REQUIRED, FIFO-sorted), plus status filtering including a read-only `DRAFT` view with no actions available.
- **Assignment**: "Assign to Me" / "Start Review" action (`POST /reviewer/registrations/{id}/assign`), moving items into a personal "My Tasks" queue.
- **Decision Module**: Approve, Request Action, and Reject flows exactly as specified — including the required-comment validation rule (Reject and Request Action must not be submittable without a comment).
- **Registration Detail View**: split-screen layout — read-only submitted JSON on the left, decision module on the right.
- **Navigation & queue structure**: global nav (Registration Queue, Problem Queue, My Reviews, Logout) and the three-tab queue view (Inbox / My Reviews / History) with the correct status mapping to each tab.

### 3. Completeness
- Every screen, action, filter, tab, and validation rule described in the spec must be implemented — nothing left as a stub, placeholder, or "TODO" unless it falls under Section 4 of the spec ("Extended Capabilities — For Future Implementation"). Section 4 (Source Verification, Problem Verification) is explicitly out of scope for this pass — do not build it, but don't let it block or break the rest of the app either.
- If the prototype is missing a screen or state that the spec requires (e.g. Access Denied page, empty queue states, comment-validation UI), build it in a style consistent with the rest of the prototype rather than skipping it.

### 4. Working method
- If something in the prototype and the spec genuinely conflict in a way that can't be reasonably reconciled, stop and ask rather than guessing.
- Otherwise, don't ask clarifying questions for things you can reasonably infer from the prototype or spec — make the call, note the assumption briefly, and keep going.
