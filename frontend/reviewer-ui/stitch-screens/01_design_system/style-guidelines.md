## Brand & Style

This design system establishes an authoritative, reliable, and accessible visual standard for sovereign-grade administrative applications. Built specifically for high-trust institutional workflows—such as organizational registration, statutory identity validation (KYC), and multi-tiered compliance tracking—the design system eschews transient consumer software trends in favor of disciplined, high-density civic utility.

The aesthetic philosophy draws from **Corporate / Modern** civic architecture paired with **Low-Contrast Structural Outlines**. It projects stability, transparency, and procedural rigor. Visual noise is actively minimized: glassmorphism, aggressive gradients, and decorative animations are replaced with structured tabular forms, unambiguous status demarcations, crisp hairline borders, and balanced whitespace. 

The interface communicates institutional confidence to diverse user groups, spanning rural governance representatives (Panchayati Raj Institutions) to ministry nodal officers and corporate leaders. The emotional tone is reassuring, official, and unyielding in operational clarity.

## Layout & Spacing

The layout model is governed by an **8-Point Linear Grid** deployed across a disciplined **12-Column Responsive Layout**. 

- **Structure**: Core workflows (KYC Stepper, Verification Forms, OTP screens) conform to a centered fixed container width (`form-max-width: 42rem` / 672px) to keep line-lengths comfortable and focus uninterrupted. Dashboards and timeline tracking expand up to `container-max-width: 72rem` (1152px).
- **Responsive Adaptations**:
  - **Mobile (< 640px)**: 4 columns, single-column field stacking, sticky bottom actions, and edge-to-edge content margins (`gutter-mobile: 1rem`). Stepper transitions from a horizontal ribbon to a compact numeric summary (`Step X of 5`).
  - **Tablet (640px - 1024px)**: 8 columns, 2-column input pairing for related attributes (e.g., State/District, Category/Sub-type).
  - **Desktop (> 1024px)**: 12 columns, horizontal multi-stage stepper with text descriptions, split preview panes for draft inspection and file upload matrices.
- **Rhythm**: Spacing between input groups defaults to `space-lg` (24px). Spacing between input labels and controls is strictly `space-xs` (4px) to preserve semantic grouping.

## Elevation & Depth

Visual hierarchy is communicated through **Low-Contrast Structural Outlines and Controlled Tonal Layers**, avoiding floating dropshadows or illusionistic depth.

- **Flat Planes with Hairline Framing**: All interactive surfaces, forms, and cards rest on crisp white backgrounds (`#FFFFFF`) framed with 1px solid borders (`#E2E8F0`). Secondary panels and container shells utilize `#F8FAFC`.
- **Elevation Steps**:
  - **Level 0 (Canvas)**: Surface background (`#F8FAFC`), entirely flat.
  - **Level 1 (Cards & Inputs)**: Surface white (`#FFFFFF`), border 1px solid (`#E2E8F0`), no shadow.
  - **Level 2 (Hover & Focus States)**: Border shifts to institutional navy (`#1E3A8A`) or saffron accent (`#E05A10`) with a 0 0 0 1px ring overlay.
  - **Level 3 (Modals & Banners)**: Reserved strictly for critical state interventions (Deficiency notices, Document preview dialogs, Verification approval modals). Uses a restrained administrative shadow: `0 10px 15px -3px rgba(10, 37, 64, 0.08), 0 4px 6px -4px rgba(10, 37, 64, 0.04)`.

## Components

### Buttons
- **Primary**: Solid institutional navy (`#0A2540`), white text, 4px border radius, 40px height (`py-2 px-5`), semi-bold typography. Hover state shifts to `#1E3A8A`. Active state sets background to `#0F172A`.
- **Secondary / Outline**: 1px solid border (`#CBD5E1`), background transparent, text `#0A2540`. Hover transitions to `#F1F5F9`.
- **Destructive / Resubmit**: Deep saffron border and fill states for deficiency resolution flows (`#E05A10`).
- **State Specifications**: Disabled buttons display solid `#E2E8F0` with `#94A3B8` text; cursor set to `not-allowed`.

### Form Fields & Inputs
- **Base Input**: 40px height, 1px solid `#CBD5E1`, background `#FFFFFF`, text `#0F172A`, placeholder `#94A3B8`.
- **Focus State**: 2px border `#0A2540` or 1px border with `box-shadow: 0 0 0 3px rgba(10, 37, 64, 0.12)`.
- **Mandatory Indicators**: Red/Saffron asterisk (`*`) styled in `#E05A10` with descriptive aria-label. Optional fields explicitly carry muted trailing text `(Optional)`.
- **Fixed Prefix Inputs (Mobile)**: Prefix `+91` rendered in an integrated, non-editable gray badge (`#F1F5F9`) with a 1px border separator preceding the active numeric field.
- **OTP Segmented Input**: 6 individual square cells (48px x 48px), centered monospace text, auto-advance on keystroke, paste detection, backspace regress.

### Status Pills
- **Geometry**: Height 24px, padding 2px 10px, border-radius 9999px, text 11px uppercase bold with 0.04em letter-spacing.
- **Variants**:
  - `SUBMITTED`: Azure background (`#EFF6FF`), text (`#1E40AF`), border (`#BFDBFE`).
  - `UNDER REVIEW`: Deep violet background (`#F5F3FF`), text (`#5B21B6`), border (`#DDD6FE`).
  - `ACTION REQUIRED`: Saffron background (`#FFF7ED`), text (`#9A3412`), border (`#FED7AA`).
  - `APPROVED`: Emerald background (`#ECFDF5`), text (`#065F46`), border (`#A7F3D0`).

### Checkboxes & Radio Selectors
- **Geometry**: 18px square (checkbox) or circle (radio), 1.5px solid border `#94A3B8`. 
- **Active State**: Primary navy (`#0A2540`) fill with crisp white internal mark. Focused with 2px offset ring.
- **Card-Level Selectors (Entity Categories)**: Selectable interactive cards (Government, Citizen, Industry, Community, HEI) display 1px solid `#E2E8F0` resting borders. When selected, border transitions to 2px solid `#0A2540` with a subtle blue wash (`#F0F4F8`).

### Stepper Component
- **Horizontal Progress (Desktop)**: Sequential stages connected by a 2px horizontal stroke (`#E2E8F0` default, `#0A2540` completed). 
- **Step Indicators**: 32px diameter circles.
  - *Completed*: Deep Navy fill (`#0A2540`) with a white checkmark icon.
  - *Active*: Deep Navy border (2px) with white center and navy digit.
  - *Pending*: Slate outline (`#CBD5E1`) with muted slate text (`#64748B`).

### Document Uploader Dropzone
- **Container**: 2px dashed border (`#CBD5E1`) over `#F8FAFC` background. 
- **Upload Action**: Clear file type list (`PDF, PNG, JPG up to 5MB`), dedicated secondary button (`Select Document`), and uploaded document chips featuring filename, size, validation badge, and replacement/removal triggers.

### Timeline & Audit Tracking
- **Structure**: Vertical left-aligned 2px track (`#E2E8F0`). Milestones marked by 12px status-colored circular nodes.
- **Audit Cards**: White background, 1px solid `#E2E8F0`, timestamped with `mono-code` dates, actor credentials, transition pills (`SUBMITTED → UNDER REVIEW`), and reviewer commentary blocks.