# Portal Build Progress

Running checklist for the new Innovation Portal frontend.
Update after each screen/component/API milestone.

Legend: [ ] todo · [x] done

## Screens
- [ ] Phase 0 — Architecture + Design System
- [ ] Landing (`/`)
- [ ] Problem Explorer (`/problems`)
- [ ] Problem Detail (`/problems/:id`)
- [ ] Login + OTP (`/login`)
- [ ] Register (`/register`)
- [ ] Dashboard (`/app/dashboard`)
- [ ] My Submissions (`/app/submissions`)
- [ ] Create Submission (`/app/submissions/new`)
- [ ] Submission Detail (`/app/submissions/:id`)
- [ ] Profile (`/app/profile`)

## Components
- [ ] UI primitives (Button, Card, StatusBadge, Input, Select, Textarea, OtpInput,
      Stepper, Timeline, Tabs, Pagination, SearchInput, FileRow, Avatar, Callout,
      Skeleton, Spinner, EmptyState, ErrorState, Toast, Modal)
- [ ] Layout shells (MarketingLayout, AuthLayout, AppLayout)
- [ ] Layout parts (MarketingNav, Footer, AppSidebar, AppTopbar, PageContainer)
- [ ] Feature components (ProblemCard/Grid/Filters/Search, SubmissionCard/List,
      SubmissionWizard, FileUploader, StatusTimeline, LoginForm, RegisterForm,
      ProfileView, TeamList)

## APIs integrated
- [ ] auth: login / register / verify-otp / refresh / logout
- [ ] portal: me / registerStudent / getProblems / getProblem
- [ ] portal: getMySubmissions / createSubmission / getSubmission /
      updateSubmissionMeta / submitSubmission
- [ ] portal: files list / upload / delete / download

## Verification
- [ ] `npm run lint` green
- [ ] `npm run build` green
- [ ] Responsive at 375 / 768 / 1024 / 1440
- [ ] Loading / empty / error states on every data page
- [ ] Keyboard nav + focus rings
- [ ] `prefers-reduced-motion` respected
- [ ] No mock data in final build
- [ ] Old frontend untouched

## Backend blockers (see also docs/PORTAL_BACKEND_BLOCKERS.md)
- None yet.

## Notes / visual mismatches
- Stitch `docs/stitch-analysis/` folder absent → authoritative source is
  `stitch-designs/` (see Implementation Plan §0).
- Known mismatches tracked in Implementation Plan §14.
