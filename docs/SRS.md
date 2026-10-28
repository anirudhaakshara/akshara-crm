# SRS — "Akshara CRM": full-stack CRM with built-in ML insights

## 0. Working agreement
- Iterative delivery in 4 phases (Section 7). Each phase is a large, complete slice that ends deployed and working on Vercel.
- Before each phase, show a concise plan (files, migrations, acceptance checks) and wait for my "go". Build the whole phase, then stop and wait for "next".
- End of every phase: `npm run build` and `npm run lint` pass with zero errors, verify the acceptance criteria in the browser, update CHANGELOG.md, commit, and tag (v0.1, v0.2, v0.3, v1.0). Tell me when it's ready to push.
- Don't break earlier phases; re-check their core flows before finishing.
- No features outside this spec without asking. Save this file as docs/SRS.md and re-read the relevant section at the start of each phase.

## 1. Purpose
A web CRM for a small business sales team: manage companies and contacts, move deals through a sales pipeline, log activities, track follow-up tasks, and get ML-driven insights (deal win probability and revenue forecast) plus sales analytics.

## 2. Tech stack (fixed)
- Next.js 14+ (App Router), TypeScript strict mode
- Tailwind CSS + shadcn/ui, lucide-react, Recharts, @dnd-kit
- Backend: Next.js Route Handlers under /api/*, Zod schemas shared between client and server
- Database: Supabase PostgreSQL, accessed ONLY through Prisma ORM from the server (no Supabase client in the browser)
  - DATABASE_URL = Supabase pooled connection (port 6543, `?pgbouncer=true&connection_limit=1`) for runtime
  - DIRECT_URL = Supabase direct connection (port 5432) for migrations; set `directUrl` in schema.prisma
- Auth: Auth.js (NextAuth) Credentials provider, bcrypt, JWT sessions
- ML: implemented in TypeScript with no external ML service (see Section 5); Vitest for tests
- Deployment: Vercel from GitHub; build command `prisma generate && prisma migrate deploy && next build`
- Secrets only in env vars (DATABASE_URL, DIRECT_URL, AUTH_SECRET); provide .env.example

## 3. Cross-cutting requirements
- Server-side authorization in every API route. Roles: ADMIN (all records), SALES_REP (only records they own).
- Error format: { error: { code, message, fields? } } with correct HTTP status codes.
- Server-side pagination, search, filters and sorting on all list endpoints.
- UI: modern SaaS look, collapsible sidebar, dark/light mode, responsive to 375px, loading skeletons, empty states, toasts, confirm-before-delete.
- INR with Indian grouping (₹12,34,567); dates as DD MMM YYYY.
- Feature-based folders (/features/<module>/{components,schemas,server}), no `any`, reusable DataTable and form components.

## 4. Data model (Prisma)
- User: id, name, email (unique), passwordHash, role (ADMIN | SALES_REP), createdAt
- Company: id, name, industry, website, city, phone, ownerId, createdAt, updatedAt
- Contact: id, firstName, lastName, email, phone, jobTitle, companyId?, ownerId, status (LEAD | PROSPECT | CUSTOMER | CHURNED), source (WEBSITE | REFERRAL | COLD_CALL | SOCIAL | EVENT | OTHER), createdAt, updatedAt
- Deal: id, title, value (Decimal), stage (NEW | CONTACTED | PROPOSAL | NEGOTIATION | WON | LOST), expectedCloseDate, closedAt?, lostReason?, contactId, companyId?, ownerId, winProbability (Float?), scoreFactors (Json?), createdAt, updatedAt
- Activity: id, type (CALL | EMAIL | MEETING | NOTE), subject, description, occurredAt, contactId?, dealId?, userId, createdAt
- Task: id, title, description, dueDate, priority (LOW | MEDIUM | HIGH), status (OPEN | DONE), contactId?, dealId?, assigneeId, createdAt
- ModelVersion: id, name ("deal-win"), weights (Json), featureStats (Json, for normalization), metrics (Json: accuracy, precision, recall, AUC, trainSize, testSize), isActive (Boolean), trainedAt
Indexes on ownerId, stage, status, dueDate, closedAt. Explicit onDelete rules on all relations.

## 5. ML features
### 5.1 Deal win-probability model (logistic regression)
- Implement logistic regression from scratch in /lib/ml/logisticRegression.ts (batch gradient descent, L2 regularization, z-score normalization). Pure functions, fully typed.
- Features engineered per deal in /lib/ml/features.ts:
  log(deal value), stage ordinal, contact source (one-hot), activity count in the last 14 days, total activity count, days since last activity, deal age in days, meeting count, company industry (one-hot, top industries + OTHER).
- Training: use closed deals (WON = 1, LOST = 0), stratified 80/20 train/test split, fixed random seed. Store weights, normalization stats and test metrics in ModelVersion; mark the new version active.
- Triggers: `npm run train` script, plus an admin-only "Retrain model" button (POST /api/ml/train).
- Inference: for open deals, compute winProbability and per-feature contributions (weight × normalized value) whenever a deal or its activities change; store them on the Deal.
- UI: Hot (≥70%) / Warm (40–69%) / Cold (<40%) badges on Kanban cards and deal pages, with a tooltip listing the top 3 positive and negative factors in plain English (e.g. "3 meetings in last 14 days: +12%").
- Fallback: if no active model exists or there are fewer than 30 closed deals, show "Not enough data" instead of a score.

### 5.2 Revenue forecast
- Expected revenue for the current and next month = Σ(open deal value × winProbability) for deals expected to close in that month.
- Trend: simple linear regression on monthly won revenue over the last 12 months, projected 3 months ahead.
- Show both on the dashboard as a chart of actual vs projected, with the weighted pipeline figure.

### 5.3 Model Insights page (admin)
Active model version, trained date, test metrics (accuracy, precision, recall, AUC), a confusion matrix, a feature-importance bar chart (absolute weights), and the retrain button.

### 5.4 Seed data must make the model learnable
Generate ~200 closed deals over 12 months with outcomes correlated to the features (more recent activity, meetings, referral source and later stage → higher win rate, plus noise), and ~40 open deals. The model should reach ~70%+ test accuracy on the seed data. Use a fixed seed so results are reproducible.

## 6. API
/api/companies, /api/contacts, /api/deals, /api/activities, /api/tasks, /api/users, /api/dashboard/stats, /api/search?q=, /api/ml/train, /api/ml/model, /api/health
CRUD (list with pagination/filters, get, create, patch, delete) wherever applicable; Zod-validated.

## 7. Phases

### Phase 1 — v0.1 Foundation, auth and deploy
- Scaffold the project; connect Prisma to Supabase (pooled + direct URLs); create the FULL schema from Section 4 and run the initial migration.
- Auth (login/logout, middleware protection), app shell (sidebar, header, user menu, theme toggle).
- Seed script: 1 admin (admin@akshara.test / Admin@123), 2 reps, 10 companies, 60 contacts, all deals from 5.4, ~400 activities, 30 tasks. Indian names, cities, industries.
- /api/health that runs a real DB query. README, .env.example, CHANGELOG.
Acceptance: live Vercel URL works; login works for admin and rep; /api/health reports the DB connected; seeded data is visible in Supabase.

### Phase 2 — v0.2 Core CRM modules
- Companies, Contacts: tables with search/filters/sorting/pagination, create/edit dialogs, detail pages (company page lists its contacts and deals with total value).
- Deals: Kanban by stage with ₹ column totals and drag-to-change-stage (optimistic PATCH; WON/LOST sets closedAt; LOST asks for lostReason), table view toggle, deal detail page.
- Activities: log from contact and deal pages; reverse-chronological timelines.
- Tasks: Open/Done tabs, priority and assignee filters, overdue highlighting, mark complete, create from contact/deal pages.
Acceptance: all CRUD works live; stage changes persist after refresh; a rep cannot access another rep's records, verified through the API as well.

### Phase 3 — v0.3 ML and dashboard
- Everything in Section 5: logistic regression, feature engineering, training script and endpoint, inference on change, score badges with factor tooltips, revenue forecast, Model Insights page.
- Vitest tests for the logistic regression (converges on a toy separable dataset), feature engineering, and forecast math.
- Dashboard as the post-login home: KPI cards (open pipeline value, weighted pipeline, won this month, win rate %, open and overdue tasks), charts (pipeline by stage, won revenue actual vs projected, leads by source), my tasks due today/overdue, recent activities. All stats via DB aggregate queries.
Acceptance: tests pass; model trains and shows metrics; logging a meeting on a deal changes its win probability; dashboard numbers match the data.

### Phase 4 — v1.0 Power features, polish, release
- Global search (Ctrl/Cmd+K) across companies, contacts and deals.
- CSV export of contacts and deals respecting filters and permissions.
- Admin user management (create users, change roles).
- Polish: mobile pass on every page, consistent loading/empty/error states, accessibility basics.
- README: architecture overview, Mermaid ER diagram, ML approach (features, training, metrics, limitations), test credentials, live URL.
Acceptance: all earlier acceptance criteria still pass; v1.0 tagged and live.
