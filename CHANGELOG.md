# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
