# Akshara CRM 🚀

A modern full-stack web CRM for small business sales teams, featuring Indian Rupee (`₹`) pipeline management and in-house Machine Learning insights (deal win probability and revenue forecasting).

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router), TypeScript (Strict Mode)
- **Styling & UI**: Tailwind CSS, Lucide React, `next-themes` (Dark/Light mode)
- **Database**: [Supabase](https://supabase.com/) PostgreSQL via [Prisma ORM](https://www.prisma.io/)
  - `DATABASE_URL`: Supabase pooled connection (`port 6543`, `pgbouncer=true&connection_limit=1`)
  - `DIRECT_URL`: Supabase direct connection (`port 5432`) for schema migrations
- **Authentication**: Auth.js / NextAuth (Credentials provider, `bcryptjs`, JWT session strategy)
- **ML Engine**: In-house pure TypeScript logistic regression & forecasting engine (no external ML SaaS required)
- **Deployment**: [Vercel](https://vercel.com/) with GitHub CI/CD

---

## 📋 Default Credentials (Seeded)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@akshara.test` | `Admin@123` | Full access to all records, ML retraining, team settings |
| **Sales Rep** | `rahul.sharma@akshara.test` | `Rep@123` | Access to owned companies, contacts, deals, tasks |
| **Sales Rep** | `priya.patel@akshara.test` | `Rep@123` | Access to owned companies, contacts, deals, tasks |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 / 24)
- npm or pnpm

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your Supabase connection strings and a secure random `AUTH_SECRET`:
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
AUTH_SECRET="your-32-byte-secret"
NEXTAUTH_SECRET="your-32-byte-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seeding
```bash
# Push schema migrations to Supabase
npm run db:migrate

# Seed reproducible test data (240 deals, 60 contacts, 400+ activities)
npm run db:seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Train the Win-Probability Model
```bash
npm run train   # trains on closed deals, activates the model, rescores open deals
npm test        # Vitest: logistic regression, feature engineering, forecast maths
```
Admins can also retrain from **ML Insights → Retrain model** (`POST /api/ml/train`).

### 6. Health Check
Verify live database connectivity by navigating to:
```
GET /api/health
```

---

## 🏗 Build & Deploy on Vercel

Build command configured for Vercel:
```bash
prisma generate && prisma migrate deploy && next build
```

---

## 🧠 ML Notes (v0.3)

- **Model**: logistic regression written from scratch (`src/lib/ml/logisticRegression.ts`): z-score normalisation fitted on the training split, batch gradient descent, L2 regularisation (λ = 0.01, lr = 0.1, up to 3,000 iterations).
- **Training data**: closed deals (Won = 1, Lost = 0), stratified 80/20 split with seed 42. Features are measured **as of each deal's close date**, so activity logged after a deal closed never leaks into training. Rows are ordered deterministically so the split is identical in every environment.
- **Features** (`src/lib/ml/features.ts`): log deal value, activities in the last 14 days, total activities, days since last activity, deal age, meeting count, contact source (one-hot) and company industry (top 5 + OTHER, one-hot).
- **Metrics** stored per model version: hold-out accuracy, precision, recall, ROC AUC, confusion matrix, plus a stratified 5-fold cross-validated accuracy/AUC as a steadier estimate (a 40-row hold-out moves 2.5 points per deal).
- **Inference**: open deals are rescored whenever the deal or one of its activities is created, edited or deleted, and all open deals are rescored after each training run. Each factor's effect is shown in percentage points versus the same deal at the training average for that feature.
- **Fallback**: with no active model, or fewer than 30 closed deals, deals show "Not enough data" instead of a score.
- **Forecast**: expected revenue = Σ(open value × win probability) for deals expected to close this month / next month; trend = least-squares line over the last 12 complete months of won revenue, projected 3 months ahead. Months and "today" are in IST.

### Known limitations
- **Stage is not a model feature.** The schema keeps no stage history, and closed deals only carry WON/LOST (the label itself), so a stage ordinal would leak the outcome. Stage is shown on open deals but excluded from training.
- **Small, synthetic training set.** 200 seeded deals give ~75% hold-out and ~76% cross-validated accuracy (baseline “always won” is 65%). Some weights reflect quirks of the generator rather than real sales behaviour, e.g. longer gaps since the last activity look slightly positive because seeded activities are spread evenly across each deal's life.
- Scores are a ranking aid, not a guarantee; retrain after meaningful new closed-deal history.
