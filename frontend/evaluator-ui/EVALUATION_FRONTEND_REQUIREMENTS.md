# Evaluation Service Frontend Requirements

This document describes the frontend required for the implemented evaluation service. It is based on the public controllers, DTOs, database schema, seeded criteria, service behavior, and the existing actor console.

The evaluation frontend has three role-based areas:

1. Evaluator dashboard
2. Admin/reviewer evaluation management
3. Admin evaluator onboarding

The current evaluator test console is located at `actor-ui/evaluator.html`. It covers authentication, evaluator profile, criteria, assignment scoring, and raw requests. It does not currently contain the project-review workflow.

## 1. Service and Access

Browser requests should normally go through the Caddy gateway:

- Gateway: `http://localhost:8080`
- Evaluation service: `http://localhost:8083`

Evaluation endpoints are protected by JWT roles:

- `EVALUATOR`: evaluator profile, assignments, scoring, project reviews
- `ADMIN`: evaluation administration and evaluator onboarding
- `REVIEWER`: evaluation administration
- `ADMIN` and `REVIEWER`: evaluation queue, cycle operations, analysis, routing, and portal publishing

The evaluation service does not own user authentication. Authentication is provided by the source service, but every evaluation frontend needs to use the resulting access token.

## 2. Shared Application Shell

Every role-based frontend should provide:

- Application name and environment indicator
- Current logged-in user indicator
- Current role badge
- Logout button
- Role-based navigation:
  - Submitter
  - Reviewer
  - Admin
  - Evaluator
- Global success notification area
- Global error notification area
- Loading indicator for each API operation
- Confirmation dialog for destructive or final actions
- Unauthorized state (`401`)
- Forbidden state (`403`)
- Not-found state (`404`)
- Conflict state (`409`)
- Session-expired state
- Empty-state panels
- Retry controls for failed requests

The current development consoles also have a configurable base URL and a raw API response panel. Those are useful for testing but should not normally be exposed in a production frontend.

## 3. Authentication Area

Authentication endpoints are provided by the source service:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-otp`
- `POST /auth/refresh`
- `POST /auth/logout`

### Fields

- Phone number
  - Required
  - Exactly 10 digits
- Optional email address
- OTP challenge ID
- OTP code
- Refresh token
- Access token storage

### Buttons

- `Login`
- `Register`
- `Verify OTP`
- `Use devOtp` (development only)
- `Refresh token`
- `Logout`
- `Clear tokens` (development/testing only)

### Authentication states

- Not logged in
- Login/register request submitted
- OTP verification pending
- Authenticated with the correct role
- Authenticated with the wrong role
- Access token expired
- Refresh token expired
- Evaluator role exists but evaluator profile is not onboarded
- Authentication request failed

When the user has the `EVALUATOR` role but no evaluation profile, display a clear onboarding error. The evaluator cannot receive routed assignments until a profile exists.

## 4. Evaluator Dashboard

Evaluator endpoints are defined in `evaluation-service` under `EvaluatorController`.

### 4.1 Evaluator profile panel

Endpoint:

`GET /evaluation/me/profile`

Display:

- Full name
- Evaluator type/pool:
  - `GOVERNMENT`
  - `INDUSTRY`
  - `HEI`
  - `CITIZEN`
  - `COMMUNITY`
- Organization
- Designation
- Experience years
- Region/state list
- Affiliated source ID, if present
- Maximum workload
- Active/inactive status
- Profile ID
- User ID
- Profile creation date
- Last updated date

Buttons:

- `Load my profile`
- `Refresh profile`

The evaluator profile is read-only from the evaluator frontend.

### 4.2 Criteria panel

Endpoint:

`GET /evaluation/me/criteria`

Display the active criteria for the evaluator's pool in `sortOrder`.

Each criterion needs:

- Criterion label
- Criterion key
- Description
- Maximum score
- Existing score, if already entered
- Existing comment, if already entered

Buttons:

- `Load criteria`
- `Refresh criteria`

#### Seeded government criteria

- Policy Relevance
- Administrative Feasibility
- Implementation Feasibility
- Public Impact
- Urgency

#### Seeded industry criteria

- Technology Feasibility
- Scalability
- Innovation Potential
- Implementation Cost
- Market Potential

#### Seeded HEI criteria

- Technical Validity
- Research Potential
- Innovation
- Scientific Feasibility
- Knowledge Gap

#### Seeded citizen criteria

- Problem Importance
- Real User Impact
- Urgency
- Accessibility
- Expected Improvement

#### Seeded community criteria

- Social Impact
- Community Need
- Inclusiveness
- Community Adoption
- Sustainability

The frontend must use the returned `maxScore` for each criterion instead of assuming a fixed value. The seeded criteria currently use a maximum score of `10`.

## 5. Evaluator Work Queue

Endpoint:

`GET /evaluation/me/assignments`

Optional query parameter:

`status`

Supported assignment statuses:

- `ASSIGNED`
- `IN_PROGRESS`
- `SUBMITTED`
- `DECLINED`
- `EXPIRED`
- `REVIEWED`

The backend returns assignments ordered by earliest deadline first.

### Queue controls

- Status dropdown
- `All statuses` option
- `Load queue`
- `Refresh queue`
- Optional search by assignment ID
- Optional search by cycle ID
- Optional search by problem ID
- Optional deadline sorting control

### Assignment row or card

Each assignment should display:

- Assignment ID
- Cycle ID
- Problem ID
- Assignment status
- Evaluation cycle status
- Assigned date
- Deadline
- Submitted date, if available
- Overdue indicator
- Number of criteria scored
- Total number of active criteria
- Progress indicator, for example `3 / 5 scored`

Buttons:

- `Open assignment`
- `Accept`
- `Decline`
- Optional `View details`

### Assignment states

- Assigned and awaiting acceptance
- In progress
- Submitted
- Declined
- Expired
- Reviewed
- Overdue
- No assignments available

An overdue assignment should visibly warn the evaluator that accepting or submitting it will fail with an expiration conflict.

## 6. Assignment Scoring Screen

Endpoint:

`GET /evaluation/me/assignments/{assignmentId}`

The scoring screen should contain the following sections.

### 6.1 Assignment summary

Display:

- Assignment ID
- Cycle ID
- Problem ID
- Current assignment status
- Evaluation cycle status
- Assigned date
- Deadline
- Submitted date
- Overdue status
- Scored criteria count
- Total criteria count

Buttons:

- `Back to queue`
- `Accept assignment`
- `Decline assignment`
- `Submit scorecard`

### 6.2 Problem information

The problem is fetched from `problem-service`. The response can contain `problem = null` if the problem service is unavailable, so the frontend must support both states.

When available, display:

- Problem title
- Problem description
- Problem status
- Source bucket
- Urgency
- Severity
- Domains
- Evidence count
- Access rule
- Access universities, when applicable
- Expected outcome

Recommended UI elements:

- Problem title heading
- Description text block
- Metadata badges
- Domain tags
- Evidence count badge
- Access-rule alert
- Expected-outcome section
- Optional `View evidence` or `Open evidence` action if a separate problem-service endpoint is integrated

Access-rule display values:

- Open to all universities and students
- University-only
- Selected universities only

When the problem cannot be loaded:

- Show a warning banner
- State that problem-service is unavailable
- Continue displaying the criteria form
- Do not block scoring solely because problem context is unavailable

### 6.3 AI analysis panel

AI analysis is advisory only. It must never be presented as the evaluator's score or recommendation.

Display:

- Provider
- Model
- Problem category
- Domain
- Sector
- Impact areas
- Complexity
- Potential scale
- Technology relevance
- Social impact
- AI summary
- Analysis status:
  - `SUCCESS`
  - `FAILED`
  - `HEURISTIC_FALLBACK`
- Error message, if present
- Analysis latency
- Analysis timestamp

UI elements:

- Advisory-only label
- Expand/collapse control
- Loading state
- Analysis unavailable state
- Failed-analysis warning
- Optional raw/details view

Do not add controls that allow the evaluator to modify the AI result.

## 7. Accepting and Declining Assignments

### 7.1 Accept assignment

Endpoint:

`POST /evaluation/me/assignments/{assignmentId}/accept`

Button:

- `Accept assignment`

Behavior:

- Changes `ASSIGNED` to `IN_PROGRESS`
- Repeated acceptance is a no-op
- Accepting after the deadline marks the assignment expired and returns a conflict

Recommended confirmation dialog:

- Assignment ID
- Problem title
- Deadline
- `Cancel`
- `Accept`

### 7.2 Decline assignment

Endpoint:

`POST /evaluation/me/assignments/{assignmentId}/decline`

Required UI:

- Decline modal/dialog
- Reason textarea
- Character counter
- Optional reason
- Maximum length: 1,000 characters

Suggested reason values or examples:

- Conflict of interest
- Outside expertise
- Workload issue
- Other

Buttons:

- `Cancel`
- `Decline assignment`

After declining, the cycle may return to `ROUTING`. The same evaluator must be skipped during rerouting for that cycle.

## 8. Scorecard

The scorecard must render one section per active criterion.

### 8.1 Per-criterion elements

- Criterion label
- Criterion key
- Criterion description
- Maximum score
- Required numeric score input
- Optional comment input or textarea
- Existing saved score
- Existing saved comment
- Inline validation message
- Required-field indicator

Score input:

- Numeric input
- Minimum: `1`
- Maximum: criterion-specific `maxScore`
- Use the returned criterion maximum

Comment input:

- Optional
- Maximum length: 4,000 characters

### 8.2 Scorecard-level fields

- Overall feedback textarea
  - Optional
  - Maximum length: 4,000 characters
- Recommendation input
  - Optional
  - Maximum length: 255 characters

Example recommendation:

`Prioritize for pilot`

### 8.3 Scorecard buttons

- `Load criteria`
- `Fill test scores` (development only; do not expose in production)
- `Submit scorecard`
- `Cancel`
- `Reset scores`

The current backend supports submission but does not expose a save-draft endpoint. Do not show `Save draft` unless the backend is extended.

### 8.4 Submission validation

The frontend must validate that:

- Every active criterion has a score
- No criterion appears twice
- Every score is between `1` and that criterion's `maxScore`
- The scorecard contains at least one score
- Comments do not exceed 4,000 characters
- Feedback does not exceed 4,000 characters
- Recommendation does not exceed 255 characters

The backend rejects incomplete scorecards and identifies missing criteria.

Submitting the final open assignment:

- Changes the assignment to `SUBMITTED`
- Changes the cycle to `EVALUATION_COMPLETED`
- Attempts automatic publishing to the portal

Submission should use a confirmation dialog because it closes the assignment.

## 9. Evaluator Project Review Dashboard

Project-review endpoints are defined in `EvaluatorProjectReviewController`.

The current evaluator HTML does not include this workflow. It needs a separate page or dashboard tab.

### 9.1 Project review queue

Endpoint:

`GET /evaluation/me/project-reviews`

Optional query parameter:

`status`

Supported project-review statuses:

- `ASSIGNED`
- `ACCEPTED`
- `RETURNED`

Controls:

- Status dropdown
- `All statuses` option
- `Load project reviews`
- `Refresh`
- Optional search by project title
- Optional search by problem title

Each queue row should display:

- Project review ID
- Problem ID
- Problem title
- Submission title
- Submission round
- Review status
- Created date
- Decision date, if available

Buttons:

- `Open review`
- `View submission`

### 9.2 Project review detail

Endpoint:

`GET /evaluation/me/project-reviews/{projectReviewId}`

Display:

- Project review ID
- Submission ID
- Problem ID
- Cycle ID
- Problem title
- Submission title
- Submission summary
- GitHub/repository URL
- Additional links
- Submission round
- Review status
- Existing decision comment
- Created date
- Decision date

### 9.3 Submitted files

Each submitted file should display:

- File ID
- File name
- File size
- Content type
- Download URL

The URL is gateway-relative, for example:

`/portal/files/{fileId}/download`

Buttons or links:

- `Download file`
- `Open GitHub repository`
- `Open submitted link`

The frontend must attach the evaluator JWT when downloading protected files.

### 9.4 Project-review decision form

Endpoint:

`POST /evaluation/me/project-reviews/{projectReviewId}/decision`

Decision choices:

- `ACCEPTED`
- `RETURNED`

Controls:

- Decision radio buttons or segmented control
- Decision comment textarea
- Character counter
- `Accept project`
- `Return project`
- `Cancel`

Decision comment:

- Optional for acceptance
- Strongly recommended when returning a project
- Maximum length: 2,000 characters

Behavior:

- `ASSIGNED` becomes `ACCEPTED` or `RETURNED`
- A decided review cannot be decided again
- Returned submissions can be edited and resubmitted by the participant
- A new review round can be created after resubmission

## 10. Admin and Reviewer Evaluation Management

Admin and reviewer evaluation endpoints are defined in `EvaluationAdminController`.

Both `ADMIN` and `REVIEWER` roles can access these evaluation-management endpoints.

### 10.1 Evaluation queue

Endpoint:

`GET /evaluation/queue`

Query parameters:

- `status`
- `page`
- `size`

The backend limits page size to `100`.

Controls:

- Status filter
- Page-size selector
- Previous-page button
- Next-page button
- Page-number control
- `Refresh queue`

Supported cycle statuses:

- `RECEIVED`
- `ANALYZING`
- `ROUTING`
- `EVALUATION_IN_PROGRESS`
- `EVALUATION_COMPLETED`
- `SCORES_AGGREGATED`
- `PRIORITIZED`
- `PHASE_3_READY`
- `ANALYSIS_FAILED`

Each cycle row should display:

- Cycle ID
- Problem ID
- Current status
- Trigger method
- Triggered-by user ID
- Started date
- Completed date
- Final score, if available
- Impact level
- Priority score
- Priority band
- Updated date
- Version

Buttons:

- `Open cycle`
- `Start evaluation`
- `Analyze`
- `Route`
- `Publish to portal`
- `View history`
- `Refresh`

### 10.2 Start an evaluation

Endpoint:

`POST /evaluation/problems/{problemId}/start`

Frontend elements:

- Problem ID input or problem selector
- `Start evaluation` button
- Confirmation dialog

The evaluation service does not provide a problem search/list endpoint. A problem selector must use the problem service or accept a manually entered problem ID.

Validation:

- Problem must be `REGISTERED`
- Problem must not already have an evaluation cycle
- A new cycle is created with status `RECEIVED`

### 10.3 Run AI analysis

Endpoint:

`POST /evaluation/cycles/{cycleId}/analyze`

Buttons:

- `Run analysis`
- Optional `Re-run analysis`

Display after analysis:

- Analysis status
- Provider
- Model
- AI summary
- Classification fields
- Impact areas
- Latency
- Error message, if applicable

Analysis advances the cycle to `ROUTING` and automatically attempts routing.

### 10.4 Manual routing

Endpoint:

`POST /evaluation/cycles/{cycleId}/route`

Buttons:

- `Route to evaluator`
- `Retry routing`

Display the routing result:

- Whether routing succeeded
- Assignment ID
- Evaluator profile ID
- Evaluator pool/type
- Routing message

Important empty/error states:

- No active evaluator in the matching pool
- All matching evaluators are at maximum workload
- All matching evaluators have already been assigned to this cycle

The cycle remains in `ROUTING` when no evaluator is available.

### 10.5 Publish to portal

Endpoint:

`POST /evaluation/cycles/{cycleId}/publish-to-portal`

Buttons:

- `Publish to portal`
- `Retry portal publishing`

Display:

- Cycle ID
- Published-success state
- Portal unavailable/error state

Publishing is intended for completed cycles and is idempotent.

### 10.6 Cycle detail

Endpoint:

`GET /evaluation/cycles/{cycleId}`

Display:

- Cycle ID
- Problem ID
- Current status
- Trigger method
- Triggered-by user ID
- Started date
- Completed date
- Final score
- Impact level
- Priority score
- Priority band
- Created date
- Updated date
- Version

Recommended status stepper:

```text
RECEIVED
  -> ANALYZING
  -> ROUTING
  -> EVALUATION_IN_PROGRESS
  -> EVALUATION_COMPLETED
```

Later statuses should still be displayable:

```text
SCORES_AGGREGATED
  -> PRIORITIZED
  -> PHASE_3_READY
```

### 10.7 Cycle history

Endpoint:

`GET /evaluation/cycles/{cycleId}/history`

Display as a timeline or table:

- History ID
- Previous status
- New status
- Changed-by user ID
- Comment
- Changed timestamp

Recommended elements:

- Vertical timeline
- Status transition badges
- Timestamp
- Actor information
- Expandable comment area

## 11. Admin Evaluator Onboarding

Endpoint:

`POST /evaluation/evaluator-profiles`

This endpoint is admin-only.

The evaluator user must first be created through the source service. The evaluation service only creates the evaluation profile.

### Form fields

- Source-service evaluator user ID
  - Required UUID
- Evaluator type
  - Required dropdown:
    - Government
    - Industry
    - HEI
    - Citizen
    - Community
- Full name
  - Required
  - Maximum 150 characters
- Organization
  - Optional
  - Maximum 255 characters
- Designation
  - Optional
  - Maximum 150 characters
- Experience years
  - Optional number
- Maximum workload
  - Optional positive number
  - Defaults to `5`

### Buttons

- `Create evaluator profile`
- `Cancel`
- `Clear form`

### Result display

After creation, display:

- Profile ID
- User ID
- Evaluator type
- Full name
- Organization
- Designation
- Experience years
- Maximum workload
- Active status
- Created date
- Updated date

The evaluation service currently has no public endpoints to:

- List evaluator profiles
- Edit evaluator profiles
- Deactivate evaluator profiles
- Edit workload
- Edit regions
- Edit evaluator domains

Do not add those controls unless the backend is extended.

## 12. Backend-Only Features Not Currently Frontend-Ready

The database contains structures for:

- Score aggregation
- Weighted evaluator types
- Disagreement detection
- Disagreement resolution
- Priority scoring
- Priority bands
- Evaluation weights
- Evaluation audit logs

The current public evaluation controllers do not expose endpoints for:

- Aggregating scores
- Viewing aggregation details
- Managing weight configuration
- Viewing disagreements
- Resolving disagreements
- Manually changing priority
- Completing later evaluation phases
- Viewing the evaluation-specific audit log

These should be treated as future screens, not current frontend requirements.

## 13. Error and Empty States

The frontend should explicitly handle:

- `401 Unauthorized`
- `403 Forbidden`
- `404 Evaluator profile not found`
- `404 Assignment not found`
- `404 Cycle not found`
- `404 Project review not found`
- `409 Assignment expired`
- `409 Assignment already decided`
- `409 Evaluation already started`
- `409 Evaluation already completed`
- `400 Missing score criteria`
- `400 Invalid score`
- `400 Invalid project decision`
- `400 Invalid evaluator profile data`
- `502 Portal unavailable`
- Problem service unavailable
- No assignments
- No project reviews
- No evaluator available
- No active criteria
- Empty evaluation queue
- Failed AI analysis
- Failed portal publishing

Every failed request should provide:

- Human-readable error message
- HTTP status
- Retry button where retrying is meaningful
- Request/action context
- Validation errors beside the affected fields

## 14. Suggested Frontend Page Structure

### Evaluator

- `/evaluator/dashboard`
- `/evaluator/assignments/:assignmentId`
- `/evaluator/project-reviews`
- `/evaluator/project-reviews/:reviewId`
- `/evaluator/profile`

### Admin/reviewer

- `/evaluation/queue`
- `/evaluation/cycles/:cycleId`
- `/evaluation/cycles/:cycleId/history`
- `/evaluation/start`
- `/evaluation/evaluator-onboarding`

## 15. Current Implementation Gap

The existing `actor-ui/evaluator.html` already covers:

- Evaluator authentication
- Evaluator profile lookup
- Criteria lookup
- Assignment queue
- Assignment detail
- Problem context
- AI analysis display
- Assignment acceptance
- Assignment decline
- Scorecard submission
- Feedback
- Recommendation
- Raw API requests

The primary missing evaluator feature is:

- Project-review queue
- Project-review detail
- Submitted-file downloads
- GitHub and submission links
- Accept/return decision form

The primary missing admin/reviewer feature is a dedicated evaluation-management interface for:

- Evaluation queue
- Starting cycles
- Running analysis
- Routing assignments
- Inspecting cycle status
- Inspecting status history
- Retrying portal publishing

The evaluation service also does not currently expose enough endpoints for full evaluator-profile administration beyond profile creation.
