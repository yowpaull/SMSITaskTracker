# DESIGN.md — Task Tracker

## Design Goals

Create a clean, practical, and consistent Task Tracker interface. Prioritize readability, fast task scanning, predictable interactions, accessibility, and responsive layouts. Avoid unnecessary decoration, complex layouts, heavy gradients, and visual clutter.

## UI Component System

- Use **shadcn/ui** components as the default UI building blocks.
- Reuse existing shadcn/ui components and project wrappers before creating custom components.
- Follow the project's current styling setup and design tokens. Do not introduce another component library without a clear reason.
- Use Lucide icons where useful and provide accessible labels for icon-only controls.
- Keep buttons, inputs, selects, dialogs, dropdowns, tables, badges, cards, and tooltips consistent across the application.
- Use accessible form components with clear labels, validation messages, and helpful error states.
- Use confirmation dialogs for destructive actions. Prefer deactivation over deletion for records referenced by task logs.

## Color System

Use **shades of blue as the primary color** and **white as the main background**. Keep the interface light, calm, and professional.

Suggested palette (adapt it to the project's existing shadcn theme tokens):

- Primary: `#2563EB` — primary actions, active navigation, links, and key indicators.
- Primary hover: `#1D4ED8` — hover and pressed states.
- Primary subtle: `#EFF6FF` — selected navigation, highlighted filters, and soft information backgrounds.
- Page background: `#FFFFFF`.
- Card and popover background: `#FFFFFF`.
- Main text: `#0F172A`.
- Secondary text: `#64748B`.
- Borders and dividers: `#E2E8F0`.
- Muted background: `#F8FAFC`.
- Success: an accessible green for completed/success states.
- Warning: an accessible amber for urgent or warning states.
- Destructive: an accessible red for errors and destructive actions.

Use semantic shadcn tokens such as `background`, `foreground`, `primary`, `primary-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `destructive`, and `card` wherever available. Prefer theme variables over hard-coded colors throughout components. Check contrast for text, badges, borders, and focus indicators. Do not communicate status by color alone; include text or an icon where appropriate.

Avoid violet/purple themes, excessive gradients, neon colors, and large decorative color effects.

## Typography

- Use the project's existing font unless a change is necessary. If no font has been selected, use a clean sans-serif such as **Inter**.
- Maintain a clear hierarchy:
  - Page title: `text-2xl` or `text-3xl`, semibold or bold.
  - Section title: `text-lg` or `text-xl`, semibold.
  - Card title: `text-sm` or `text-base`, medium or semibold.
  - Body text: `text-sm` or `text-base`, normal.
  - Supporting labels and metadata: `text-xs` or `text-sm`, muted foreground.
- Use consistent line heights and spacing. Avoid too many font sizes or weights on the same screen.
- Keep table data, dates, deadlines, and metrics easy to scan.
- Use readable line lengths and never rely on low-contrast muted text for essential information.

## Layout and Spacing

- Use a consistent spacing scale based on Tailwind utilities.
- Structure pages clearly: page heading, supporting description or primary action, filters when relevant, then main content.
- Align content to a consistent container and use responsive spacing.
- Use cards for related information; avoid nesting cards inside cards without a clear purpose.
- Prefer tables for dense task records and cards for compact summaries or small-screen layouts.
- Keep navigation simple, with clear active states and accessible labels.
- Group related form fields logically.
- On small screens, prevent horizontal overflow and make primary actions easy to reach.

## Task Tracker UI Patterns

- **Dashboard:** Show useful metrics such as total, overdue, in-progress, completed, and cancelled tasks. Define each metric consistently with its underlying query.
- **Task list:** Make task name, category, brand, status, urgency, importance, and deadline easy to scan. Provide practical search, filtering, and sorting controls.
- **Status:** Use consistent badges for `in_progress`, `completed`, and `cancelled`. Show overdue work (deadline before today, still open) in a dedicated column or badge — never merged into the status badge. Pair color with readable status text.
- **Urgency and importance:** Use compact labels, badges, or icons. Avoid making the entire interface visually alarming when a task is urgent.
- **Forms:** Use explicit labels, sensible defaults, inline validation, and clear submission feedback.
- **Empty states:** Explain when no records match the current view and offer a useful next action where appropriate.
- **Error states:** Explain what failed in plain language and provide a retry action when safe and useful.
- **Destructive actions:** Clearly identify the record and consequence before confirmation.

## Skeleton Loading — Required for Every Loading State

Every asynchronous content-loading state must display a **skeleton loading UI** that resembles the shape and layout of the content being loaded. Do not leave a blank page, show only a spinner, or cause major layout shifts when data arrives.

Use shadcn/ui's `Skeleton` component wherever available. Include skeletons for, at minimum:

- Dashboard metric cards and dashboard sections.
- Task tables, rows, filters, and task cards.
- Brand and category lists or tables.
- Page-level content while routes or data are loading.
- Forms or detail panels when existing records are fetched for editing.
- Dialog content that waits for remote data.
- Search and filter results while a new query is loading.
- Any other component waiting for asynchronous data.

### Skeleton Behavior

1. Match the dimensions and structure of the final UI as closely as practical.
2. Use subtle neutral or pale-blue skeleton surfaces that fit the white-and-blue theme.
3. Keep the layout stable to reduce content shifting.
4. Use `animate-pulse` or the existing shadcn skeleton animation; keep motion subtle.
5. Add an accessible loading announcement where appropriate, such as `aria-busy="true"` on the loading region and screen-reader text like “Loading tasks…”.
6. Respect reduced-motion preferences when implementing custom animations.
7. Keep loading, empty, error, and success states distinct.
8. Use framework-supported loading patterns (such as route-level loading files and component-level skeletons) where appropriate.
9. For mutations such as saving, updating, or deleting, prevent duplicate submissions and show a clear pending state. A button pending indicator or disabled state is acceptable while an action is being submitted; use skeletons when content itself is loading.
10. Never render fake task data as if it were real data.

## Accessibility and Interaction

- Use semantic HTML and accessible shadcn/ui components.
- Ensure interactive controls work with a keyboard and have visible focus states.
- Associate form labels with inputs and announce validation errors accessibly.
- Provide sufficient color contrast and meaningful button labels.
- Confirm destructive actions and do not rely on hover alone to reveal essential information.
- Use tooltips as supplemental help, not the sole source of essential instructions.
- Keep touch targets practical on mobile devices.

## Responsive Behavior

- Design for mobile, tablet, and desktop.
- On smaller screens, stack metric cards and form fields, simplify navigation, and adapt dense tables without losing essential information.
- Use responsive table wrappers or an alternate compact layout when needed.
- Verify dialogs, dropdowns, date inputs, and forms fit within the viewport.
- Keep primary actions visible and avoid horizontal page scrolling.

## Implementation Rules

1. Inspect the existing theme, Tailwind setup, shadcn/ui configuration, and installed components before making design changes.
2. Use existing CSS variables and shadcn tokens where possible; avoid duplicating theme definitions.
3. Put reusable patterns in shared components when multiple pages need the same UI.
4. Avoid adding dependencies if the existing stack can support the requirement.
5. Do not redesign unrelated pages when implementing a focused change.
6. Verify responsive layouts, focus states, skeleton states, empty states, and error states for every changed page.
7. Keep the final UI simple, polished, and consistent with the white background and blue-primary design.
