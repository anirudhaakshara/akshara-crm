# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - Phase 3: ML Insights & Dashboard

### Added
- **Logistic regression from scratch** (`src/lib/ml/logisticRegression.ts`): z-score normalisation, batch gradient descent, L2 regularisation; pure, fully typed functions.
- **Feature engineering** (`src/lib/ml/features.ts`): log deal value, activities in last 14 days, total activities, days since last activity, deal age, meeting count, contact source one-hot, company industry one-hot (top 5 + OTHER). Closed deals are measured as of `closedAt` (no leakage).
- **Training**: stratified 80/20 split with fixed seed, metrics (accuracy, precision, recall, ROC AUC, confusion matrix, 5-fold CV) stored on `ModelVersion`; new version marked active. Triggered by `npm run train` or the admin-only `POST /api/ml/train`.
- **Inference on change**: open deals are rescored when a deal is created/updated or an activity on it is created/edited/deleted, and all open deals after each training run. `winProbability` and per-factor contributions are stored on the deal.
- **Hot / Warm / Cold badges** (≥70% / 40–69% / <40%) on Kanban cards, the deals table (sortable “Win Score” column), deal and contact pages, with a tooltip listing the top 3 helping and hurting factors in plain English (e.g. “2 meetings held +12%”). “Not enough data” fallback when no model exists or fewer than 30 closed deals.
- **Deal page “Win Probability” panel** with every factor's impact.
- **Model Insights page** (`/ml/insights`, admin): active version, trained date, test and cross-validated metrics, confusion matrix, feature-importance bar chart, recent versions, Retrain button. `GET /api/ml/model`.
- **Revenue forecast**: expected revenue for this and next month from the probability-weighted pipeline; linear trend on 12 months of won revenue projected 3 months ahead.
- **Dashboard** (post-login home) backed by `GET /api/dashboard/stats` (all DB aggregates, role-scoped): KPI cards (open pipeline, weighted pipeline, won this month, win rate, open and overdue tasks), won-revenue actual vs projected chart, pipeline by stage, leads by source, my tasks due today/overdue, recent activity. Every chart has hover tooltips and a “View as table” fallback.
- **Vitest** suite (33 tests): convergence on a separable toy dataset, regularisation, metrics/AUC, stratified split and k-fold, feature engineering and labels, IST month maths, expected revenue and trend projection.

### Changed
- Task “overdue” now uses the start of today in IST on the server, matching the dashboard and the browser.

### Known limitations
- Stage ordinal is not a model feature (no stage history in the schema; closed deals only carry the label). See README → ML Notes.

## [0.2.0] - Phase 2: Core CRM Modules

### Added
- **Contacts**: list with server-side search, status/source/owner filters, sorting and pagination; create/edit dialog with shared Zod validation and inline field errors; detail page with deals, reverse-chronological activity timeline, follow-up tasks, and "New Deal" / "Log Activity" / "New Task" actions.
- **Deals API** (`/api/deals`, `/api/deals/[id]`): CRUD, search, stage/status/owner/contact/company filters, sorting, pagination with filtered ₹ total, and `?view=board` returning per-stage cards plus DB-aggregated count and ₹ total per column.
- **Deals Kanban**: six stage columns with ₹ column totals (Indian grouping + compact L/Cr), drag-to-change-stage via @dnd-kit (pointer, touch long-press and keyboard sensors), optimistic PATCH with automatic rollback on failure, lost-reason prompt when dropping on LOST, "+N more" link into the filtered table for large columns.
- **Deal stage rules**: entering WON/LOST stamps `closedAt`; LOST requires `lostReason` (400 with `fields.lostReason` otherwise); reopening a closed deal clears `closedAt` and `lostReason`.
- **Deals table view** toggle (URL-synced `?view=table`) and **deal detail page** with clickable stage stepper, contact card, activity timeline and tasks.
- **Tasks API** (`/api/tasks`, `/api/tasks/[id]`): CRUD, status/priority/assignee/contact/deal/overdue filters, sorting, pagination, and per-tab counts (`OPEN`, `DONE`, `overdue`).
- **Tasks page**: Open/Done tabs with counts, priority and assignee filters, "overdue only" toggle, overdue row highlighting, one-click mark complete/reopen; tasks can also be created and completed from contact and deal pages.
- **Activities**: `GET/PATCH /api/activities/[id]`, paginated and filterable list; activities logged on a deal automatically appear on its contact's timeline.
- Shared UI building blocks: `Modal`, `Field`, `Select`, `Textarea`, `EmptyState`, typed `apiFetch` client, list-param/pagination helpers.

### Security
- Every new route enforces ownership server-side: SALES_REPs can only read or modify their own deals, contacts, companies and tasks (403 otherwise), cannot link records to another rep's contact/deal/company, and cannot reassign owners or assignees (forced to self).
- Activity listing for reps is scoped to activities they logged or that sit on records they own; only the author (or an admin) can edit or delete an activity.
- Invalid enum query params (e.g. `?status=BOGUS`) are ignored instead of causing 500s; owner/assignee ids supplied by admins are validated.

### Fixed
- Toast context value is now memoised, preventing refetch loops on pages that list `toast` in hook dependencies.
- Activity date-time field now defaults to local time instead of UTC (was 5½ hours behind in IST).
- Delete buttons on timelines and task lists are visible on touch devices (previously hover-only).

## [0.1.0] - Phase 1: Foundation, Auth & Deploy

### Added
- **Project Scaffolding**: Next.js 14+ App Router, TypeScript strict mode, Tailwind CSS, Lucide icons, next-themes.
- **Database Architecture**: Full Prisma ORM schema connecting to Supabase PostgreSQL (pooled runtime URL and direct migration URL) with 7 models: `User`, `Company`, `Contact`, `Deal`, `Activity`, `Task`, `ModelVersion`.
- **Referential Integrity & Performance**: Explicit `onDelete` cascades/set-null and strategic indexes on `ownerId`, `stage`, `status`, `dueDate`, `closedAt`.
- **Authentication**: Auth.js / NextAuth Credentials provider with bcrypt password hashing, JWT sessions, and Edge middleware route protection.
- **App Shell**: Modern responsive SaaS layout featuring collapsible desktop sidebar, 375px mobile navigation drawer, dark/light mode toggle, and user profile menu.
- **Formatting Utilities**: Indian Rupee currency formatting (`₹12,34,567`) and standard date format (`DD MMM YYYY`).
- **Standardized API Error Format**: Structured `{ error: { code, message, fields? } }` with type-safe handlers.
- **Health Check Endpoint**: `/api/health` performing a real database connectivity query.
- **Seed Data**: Fully seeded database with 1 Admin (`admin@akshara.test`), 2 Sales Reps, 10 Indian Companies, 60 Indian Contacts, 200 closed deals correlated for ML learnability, 40 open deals, ~400 activities, and 30 follow-up tasks.
