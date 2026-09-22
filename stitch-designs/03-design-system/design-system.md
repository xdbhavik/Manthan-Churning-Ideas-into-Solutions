# Design System — Technical Innovation Engine

> Source: Stitch asset `assets/aef84654b791471fa765303cdf336340`
> (the active design system for "Innovation Portal Workspace", project `17879190541085414088`)

## Style Guidelines

The design system embodies a modern, authoritative, and developer-first institutional workspace tailored for student innovators, academic evaluators, and hackathon directors. It bridges high-trust national governance with the speed and precision of modern software development platforms.

### Core Tenets
- **Institutional Integrity:** Instills immediate confidence through rigorous alignment, clear structural hierarchy, and decisive feedback loops.
- **Developer-Centric Precision:** Emphasizes content density, clean data visualization, monospaced metadata points, and clear operational state cues.
- **Cognitive Clarity:** Eliminates visual noise. Information is organized logically through low-contrast border layering, functional surfaces, and unmistakable submission statuses.

### Visual Style
The design system draws from the **Corporate / Modern** aesthetic, infused with clean developer-tool conventions (such as GitHub, Linear, and Vercel). High-clarity typography paired with crisp `#E2E8F0` structural outlines and crisp white interactive cards creates a dependable, distraction-free environment for project submission and review.

## Colors

### Palette Architecture
- **Primary (`#1E40AF`):** Deep cobalt blue. Anchors critical CTAs, active portal tabs, and formal headers.
- **Secondary (`#2563EB`):** High-energy electric blue. Deployed for interactive hover treatments, links, and active indicators.
- **Neutrals:** `#F8FAFC` global canvas background, `#FFFFFF` content surfaces, `#0F172A` headings/body, `#64748B` metadata/labels/secondary text.
- **Structural Lines (`#E2E8F0`):** Tabular rows, layout dividers, input borders, card framing.

### State Tokens
- `DRAFT`: `#F1F5F9` bg / `#475569` text / `#CBD5E1` border
- `SUBMITTED`: `#EFF6FF` bg / `#1D4ED8` text / `#BFDBFE` border
- `UNDER_REVIEW`: `#FEF3C7` bg / `#B45309` text / `#FDE68A` border
- `RETURNED`: `#FEF2F2` bg / `#B91C1C` text / `#FECACA` border
- `ACCEPTED`: `#ECFDF5` bg / `#047857` text / `#A7F3D0` border

## Typography

- **Primary & Interface (`Inter`):** headings, labels, body, forms, tabular data.
- **Technical Metadata (`JetBrains Mono`):** submission UUIDs, Git `commitSha` hashes, API route slugs, server URLs, file size tokens.

### Scale
| Token | Family | Size / Weight / Line |
|:---|:---|:---|
| display-lg | Inter | 36px / 700 / 44px (-0.02em) |
| display-lg-mobile | Inter | 28px / 700 / 36px |
| headline-lg | Inter | 24px / 600 / 32px |
| headline-md | Inter | 20px / 600 / 28px |
| headline-sm | Inter | 16px / 600 / 24px |
| body-lg | Inter | 16px / 400 / 24px |
| body-md | Inter | 14px / 400 / 20px |
| body-sm | Inter | 12px / 400 / 16px |
| label-mono-md | JetBrains Mono | 13px / 500 / 18px |
| label-mono-sm | JetBrains Mono | 11px / 500 / 16px (0.04em) |

## Layout & Spacing

8px modular baseline. 12-col grid, max content width `1280px`, left rail 280px (3 cols) + 9-col canvas.

- Desktop ≥1280px: gutters 24px, margins 32px
- Tablet 768–1279px: 8-col
- Mobile ≤767px: 4-col, 16px gutters/margins

Spacing tokens: `space-xs` 4px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 32px.

## Elevation & Depth

- **Level 0 (Canvas):** `#F8FAFC`
- **Level 1 (Card):** `#FFFFFF` + 1px `#E2E8F0` border; optional `0 1px 3px 0 rgba(15,23,42,0.05)`
- **Level 2 (Hover/Menus):** `0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)`
- **Level 3 (Modals):** `0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.04)`; backdrop `rgba(15,23,42,0.45)`

## Shapes

- Cards/containers: 12–16px radius (`rounded-lg`)
- Controls (buttons/inputs): 8–10px (`rounded-md`)
- Status badges/chips: pill (`rounded-full`)

## Components

### Buttons
- **Primary:** `#1E40AF` bg, `#FFFFFF` text, 8px radius, 40px height, Inter 14px/600. Hover `#1D4ED8`. Focus 2px ring `#2563EB` + 2px white offset.
- **Secondary:** `#FFFFFF` bg, `#0F172A` text, 1px `#E2E8F0`. Hover `#F8FAFC` + border `#CBD5E1`.
- **Destructive:** `#FEF2F2` bg, `#B91C1C` text, 1px `#FECACA`. Hover `#FEE2E2`.

### State Chips & Badges
24px pills, 8px horizontal padding, 11px uppercase JetBrains Mono, 6px solid circular dot. Values: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `RETURNED`, `ACCEPTED`.

### Input Fields & Textareas
- Single-line: 40px height, 12px padding, white bg, 1px `#E2E8F0`, 8px radius.
- Textarea (up to 20,000 chars): persistent character counter bottom-right (`label-mono-sm`, `#64748B`).
- Focus: 1px `#2563EB` + `0 0 0 3px rgba(37,99,235,0.15)`.

### Cards & Problem Registry Tiles
White, 1px `#E2E8F0`, 14px radius, 20px padding. Header = title + category icon + status badge, then summary body, then metadata chips.

### Monospace Data Display (Git & Hashes)
`#F1F5F9` bg, `#0F172A` text, 1px `#CBD5E1`, 6px radius, JetBrains Mono 12px, copy icon.

### File Upload & Artifact Lists
2px dashed `#CBD5E1` on `#F8FAFC`. Rows: attachment icon, name (Inter 14px), size (JetBrains Mono 12px), progress bar, trash action.
