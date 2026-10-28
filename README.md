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

### 5. Health Check
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
